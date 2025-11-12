# Setup Guide

## Prerequisites

- Docker & Docker Compose
- Node.js 20+
- pnpm (recommended) or npm

## Quick Start

### 1. Install Dependencies

```bash
# Install gateway dependencies
pnpm install

# Install service dependencies (optional - services run in Docker)
cd services/auth && npm install
# Repeat for other services
```

### 2. Start Infrastructure

```bash
docker-compose up -d postgres redis rabbitmq
```

Wait for services to be healthy (check with `docker-compose ps`).

### 3. Start Services

```bash
# Start all services
docker-compose up -d

# Or start individually
docker-compose up -d auth directory catalog seatmap inventory orders payments
```

### 4. Run Database Migrations

Each service needs its database initialized. For now, services will create tables on first run (in production, use proper migrations).

### 5. Start Gateway (Development)

```bash
pnpm dev
```

The application will be available at `http://localhost:3000`

## Service URLs

- Gateway: http://localhost:3000
- Auth: http://localhost:3001
- Directory: http://localhost:3002
- Catalog: http://localhost:3003
- Seatmap: http://localhost:3004
- Inventory: http://localhost:3005
- Orders: http://localhost:3006
- Payments: http://localhost:3007
- Waitlist: http://localhost:3008
- Notifications: http://localhost:3009
- Search: http://localhost:3010
- WebSocket: http://localhost:3011
- RabbitMQ Management: http://localhost:15672 (guest/guest)

## Environment Variables

Create a `.env` file in the root:

```env
# JWT Configuration
JWT_SECRET=your-secret-key-change-in-production
JWT_PUBLIC_KEY=
JWT_PRIVATE_KEY=

# Service URLs (for local development)
AUTH_SERVICE_URL=http://localhost:3001
INVENTORY_SERVICE_URL=http://localhost:3005
CATALOG_SERVICE_URL=http://localhost:3003
SEATMAP_SERVICE_URL=http://localhost:3004
ORDERS_SERVICE_URL=http://localhost:3006
PAYMENTS_SERVICE_URL=http://localhost:3007

# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://guest:guest@localhost:5672
```

## Development Workflow

### Running Services Locally

Instead of Docker, you can run services locally:

```bash
cd services/auth
npm install
npm run dev
```

### Testing the System

1. **Register a user**: POST to `/auth/register`
2. **Login**: POST to `/auth/login` to get JWT token
3. **Browse events**: Visit `/` to see the landing page
4. **Select seats**: Navigate to `/events/[id]/[showtimeId]`
5. **Checkout**: Complete the purchase flow

## Architecture Notes

- Each service has its own database (data independence)
- Services communicate via HTTP APIs and RabbitMQ events
- Redis is used for distributed locking in Inventory service
- WebSocket service broadcasts real-time seat updates
- Next.js gateway handles UI and API routing

## Next Steps

1. Implement database migrations for each service
2. Set up proper JWT key generation (RS256)
3. Implement RabbitMQ event consumers
4. Add WebSocket client integration in gateway
5. Implement SAGA pattern for payment rollback
6. Add observability (metrics, tracing, logging)
7. Set up CI/CD pipelines

