# Event/Theater Ticket Booking System - Microservices Architecture

A comprehensive microservices-based event/theater ticket booking system with real-time seat reservation, built with Next.js 16, React 19, and distributed services.

![Demo](./demo.gif)

## Architecture

### Services

- **Gateway** (Next.js 16): API Gateway with UI, JWT validation, rate limiting
- **Auth Service**: JWT RS256 issuer, OIDC-like flows, JWKS endpoint
- **Directory Service**: Tenant/org management, user roles
- **Catalog Service**: Events, showtimes, pricing tiers
- **Seatmap Service**: Venue/section/seat definitions
- **Inventory Service**: Seat state machine, Redis locks, hold TTL
- **Orders Service**: Order creation and management
- **Payments Service**: Mock payment provider, webhooks, refunds
- **Waitlist Service**: Queue management for high-traffic events
- **Notifications Service**: Email/SMS templates
- **Search Service**: Event search functionality
- **WebSocket Service**: Real-time seat state broadcasts

### Infrastructure

- PostgreSQL (multiple databases per service)
- Redis (distributed locking, caching)
- RabbitMQ (event-driven communication)

## Getting Started

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

```bash
# 1. Install dependencies
npm install --legacy-peer-deps

# 2. Start infrastructure
docker-compose up -d postgres redis rabbitmq

# 3. Seed events (IMPORTANT - to see events on homepage!)
# On Windows:
.\seed-events.ps1

# On Linux/Mac:
chmod +x seed-events.sh
./seed-events.sh

# 4. Seed auth database (for login/register)
# On Windows:
.\seed-auth.ps1

# On Linux/Mac:
chmod +x seed-auth.sh
./seed-auth.sh

# 5. Start services (in separate terminals)
# Terminal 1: Catalog Service
cd services/catalog
npm install
# Create .env with: DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db
npm run dev

# Terminal 2: Auth Service  
cd services/auth
npm install
# Create .env.local with:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
# PORT=3001
# JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys
# CORS_ORIGIN=http://localhost:3000
npm run dev

# Terminal 3: Gateway
cd ../..
# Create .env.local in root with:
# JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys (MUST MATCH Auth Service!)
# AUTH_SERVICE_URL=http://localhost:3001
npm run dev
```

The application will be available at `http://localhost:3000` with 6 sample events!

## Development

### Service Development

Each service is in `services/<service-name>` with:
- Independent database
- Dockerfile for containerization
- Health check endpoints
- Event contracts

### Gateway Development

The Next.js gateway is in the root directory with:
- Server Components for UI
- Server Actions for API calls
- Real-time WebSocket integration
- JWT validation middleware

## Project Structure

```
.
├── apps/
│   └── gateway/          # Next.js 16 Gateway (root)
├── services/
│   ├── auth/
│   ├── directory/
│   ├── catalog/
│   ├── seatmap/
│   ├── inventory/
│   ├── orders/
│   ├── payments/
│   ├── waitlist/
│   ├── notifications/
│   ├── search/
│   └── ws/
├── packages/
│   ├── types/            # Shared TypeScript types
│   ├── auth-kit/         # JWT utilities
│   └── infra/            # Infrastructure configs
└── docker-compose.yml
```

## Key Features

- **Real-time seat updates** via WebSocket
- **Distributed locking** to prevent overselling
- **Hold mechanism** with TTL (5 minutes)
- **SAGA pattern** for payment failure rollback
- **Event-driven architecture** with RabbitMQ
- **JWT authentication** with RS256
- **Rate limiting** and anti-bot protection
- **Comprehensive observability** (health, metrics, logs, tracing)

## License

MIT
