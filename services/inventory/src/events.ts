import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import amqp from 'amqplib';

// Get the directory of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env.local first, then .env
dotenv.config({ path: join(__dirname, '../.env.local') });
dotenv.config({ path: join(__dirname, '../.env') });

let connection: amqp.Connection | null = null;
let channel: amqp.Channel | null = null;

export async function connectRabbitMQ(): Promise<void> {
  try {
    const url = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
    connection = await amqp.connect(url);
    channel = await connection.createChannel();
    
    // Declare exchanges and queues
    await channel.assertExchange('inventory', 'topic', { durable: true });
    
    console.log('✅ Inventory Service - RabbitMQ connected');
  } catch (error) {
    console.error('RabbitMQ connection error:', error);
    // Don't throw - service can work without RabbitMQ (events will fail silently)
  }
}

export async function publishEvent(
  routingKey: string,
  payload: Record<string, unknown>
): Promise<void> {
  if (!channel) {
    await connectRabbitMQ();
  }
  
  if (channel) {
    try {
      channel.publish(
        'inventory',
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true }
      );
    } catch (error) {
      console.error('Event publishing error:', error);
      // Don't throw - continue even if event publishing fails
    }
  }
}

export async function closeRabbitMQ(): Promise<void> {
  if (channel) await channel.close();
  if (connection) await connection.close();
}

