import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import amqp from 'amqplib';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

const app = express();
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

const server = createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3011;

// Map of showtimeId -> Set of WebSocket connections
const showtimeSubscriptions = new Map<string, Set<WebSocket>>();

// RabbitMQ connection
let rabbitConnection: amqp.Connection | null = null;
let rabbitChannel: amqp.Channel | null = null;

async function connectRabbitMQ() {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    rabbitConnection = await amqp.connect(url);
    rabbitChannel = await rabbitConnection.createChannel();
    
    // Declare exchange
    await rabbitChannel.assertExchange('inventory', 'topic', { durable: true });
    
    // Create queue for this service
    const queue = await rabbitChannel.assertQueue('', { exclusive: true });
    
    // Bind to inventory events
    await rabbitChannel.bindQueue(queue.queue, 'inventory', 'hold.created');
    await rabbitChannel.bindQueue(queue.queue, 'inventory', 'hold.expired');
    await rabbitChannel.bindQueue(queue.queue, 'inventory', 'seats.purchased');
    
    // Consume messages
    await rabbitChannel.consume(queue.queue, (msg) => {
      if (!msg) return;
      
      try {
        const event = JSON.parse(msg.content.toString());
        const routingKey = msg.fields.routingKey;
        
        console.log(`Received event: ${routingKey}`, event);
        
        // Broadcast to subscribed clients
        if (event.showtimeId) {
          const subscribers = showtimeSubscriptions.get(event.showtimeId);
          if (subscribers) {
            const delta = {
              type: routingKey,
              showtimeId: event.showtimeId,
              seatIds: event.seatIds || [],
              holdId: event.holdId,
            };
            
            const message = JSON.stringify(delta);
            subscribers.forEach((ws) => {
              if (ws.readyState === WebSocket.OPEN) {
                ws.send(message);
              }
            });
          }
        }
      } catch (error) {
        console.error('Error processing RabbitMQ message:', error);
      }
      
      rabbitChannel?.ack(msg);
    });
    
    console.log('✅ WebSocket Service - RabbitMQ connected');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    // Service can work without RabbitMQ (just won't have real-time updates)
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws: WebSocket, req) => {
  console.log('WebSocket client connected');
  
  const url = new URL(req.url || '', `http://localhost:${PORT}`);
  const showtimeId = url.searchParams.get('showtimeId');
  
  if (showtimeId) {
    // Subscribe to showtime
    if (!showtimeSubscriptions.has(showtimeId)) {
      showtimeSubscriptions.set(showtimeId, new Set());
    }
    showtimeSubscriptions.get(showtimeId)!.add(ws);
    console.log(`Client subscribed to showtime: ${showtimeId}`);
  }
  
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === 'subscribe' && data.showtimeId) {
        const showtimeId = data.showtimeId;
        if (!showtimeSubscriptions.has(showtimeId)) {
          showtimeSubscriptions.set(showtimeId, new Set());
        }
        showtimeSubscriptions.get(showtimeId)!.add(ws);
        console.log(`Client subscribed to showtime: ${showtimeId}`);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  });
  
  ws.on('close', () => {
    // Remove from all subscriptions
    showtimeSubscriptions.forEach((subscribers, showtimeId) => {
      subscribers.delete(ws);
      if (subscribers.size === 0) {
        showtimeSubscriptions.delete(showtimeId);
      }
    });
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
  
  ws.send(JSON.stringify({ type: 'connected', showtimeId }));
});

// Initialize RabbitMQ
connectRabbitMQ().catch(console.error);

server.listen(PORT, () => {
  console.log(`WebSocket service running on port ${PORT}`);
});

