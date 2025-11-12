# Architecture Overview

## System Design

This is a microservices-based event/theater ticket booking system with real-time seat reservation capabilities.

## Core Principles

1. **Service Independence**: Each service has its own database and can be deployed independently
2. **Event-Driven**: Services communicate via RabbitMQ events for eventual consistency
3. **Real-Time Updates**: WebSocket service broadcasts seat state changes
4. **Oversell Prevention**: Distributed locking (Redis) prevents double-booking
5. **Hold Mechanism**: Seats are held for 5 minutes before automatic release

## Service Responsibilities

### Gateway (Next.js 16)
- API Gateway with JWT validation
- UI rendering (Server Components)
- Rate limiting and anti-bot protection
- Server Actions for form handling

### Auth Service
- User authentication (login/register)
- JWT token generation (RS256)
- JWKS endpoint (`/.well-known/jwks.json`)
- Refresh token management

### Directory Service
- Organization/tenant management
- User role assignment (customer/staff/owner)
- Multi-tenancy support

### Catalog Service
- Event management
- Showtime scheduling
- Price tier definitions
- Category management

### Seatmap Service
- Venue definitions
- Section/row/seat layouts
- Accessibility flags
- Seat-to-tier mapping

### Inventory Service (Critical)
- Seat state machine (available → held → purchased)
- Distributed locking via Redis
- Hold TTL management (5 minutes)
- Oversell prevention
- Publishes events: `hold.created`, `hold.expired`, `seats.purchased`

### Orders Service
- Order creation and management
- Order item tracking
- Order status workflow
- Publishes events: `orders.completed`, `orders.canceled`

### Payments Service
- Payment processing (mock provider)
- 3DS/s virtual POS integration
- Webhook handling
- Refund management
- Publishes events: `payments.succeeded`, `payments.failed`

### Waitlist Service
- Queue management for high-traffic events
- Virtual queue with position tracking
- Automatic notification when seats become available

### Notifications Service
- Email/SMS/Push notification templates
- Event-driven notifications
- Billing, refund, reminder emails

### Search Service
- Event search (city, date, category)
- Full-text search capabilities
- Search result caching

### WebSocket Service
- Real-time seat state broadcasts
- Room-based subscriptions (per showtime)
- Heartbeat/connection management

## Data Flow

### Seat Selection & Hold

1. User clicks seat → Gateway → Inventory Service
2. Inventory acquires Redis lock for seat
3. Creates hold record (5 min TTL)
4. Updates seat state to "held"
5. Publishes `inventory.hold.created` event
6. WebSocket service broadcasts to other users
7. Returns holdId to client

### Payment Flow

1. User submits checkout → Gateway → Orders Service
2. Orders Service creates order (pending)
3. Gateway → Payments Service
4. Payments processes (mock)
5. On success: Publishes `payments.succeeded`
6. Orders Service receives event → finalizes order
7. Publishes `orders.completed`
8. Inventory Service receives event → converts hold to purchased
9. Publishes `inventory.seats.purchased`
10. WebSocket broadcasts seat state change
11. Notifications Service sends confirmation email

### Hold Expiration

1. Background worker checks expired holds
2. Publishes `inventory.hold.expired` event
3. Inventory Service releases locks and updates states
4. WebSocket broadcasts availability

## Event Contracts

### `inventory.hold.created`
```json
{
  "holdId": "hold_123",
  "userId": "user_456",
  "showtimeId": "showtime_789",
  "seatIds": ["seat_1", "seat_2"],
  "expiresAt": "2024-01-01T12:05:00Z"
}
```

### `payments.succeeded`
```json
{
  "orderId": "order_123",
  "paymentId": "pay_456",
  "amount": 1050,
  "currency": "TRY"
}
```

### `orders.completed`
```json
{
  "orderId": "order_123",
  "userId": "user_456",
  "showtimeId": "showtime_789",
  "seatIds": ["seat_1", "seat_2"],
  "total": 1050,
  "currency": "TRY"
}
```

### `inventory.seats.purchased`
```json
{
  "showtimeId": "showtime_789",
  "seatIds": ["seat_1", "seat_2"],
  "orderId": "order_123"
}
```

### `inventory.hold.expired`
```json
{
  "holdId": "hold_123",
  "showtimeId": "showtime_789",
  "seatIds": ["seat_1", "seat_2"]
}
```

## Database Schema (Per Service)

Each service maintains its own database:

- **auth_db**: users, refresh_tokens
- **directory_db**: organizations, user_roles
- **catalog_db**: events, showtimes, price_tiers
- **seatmap_db**: venues, sections, seats
- **inventory_db**: seat_states, holds
- **orders_db**: orders, order_items
- **payments_db**: payments, refunds
- **waitlist_db**: waitlist_entries

## Security

- JWT authentication with RS256
- Service-to-service communication (future: mTLS)
- Rate limiting at Gateway
- Anti-bot protection
- Input validation (Zod schemas)
- SQL injection prevention (Drizzle ORM)

## Observability

- Health check endpoints (`/health`) on all services
- Structured logging (JSON format)
- Request ID propagation
- Metrics (future: Prometheus)
- Distributed tracing (future: Jaeger)

## Scalability Considerations

- Stateless services (horizontally scalable)
- Redis for distributed locking
- RabbitMQ for async event processing
- Database connection pooling
- Cache invalidation strategies
- CDN for static assets

## Failure Handling

- SAGA pattern for payment rollback
- Circuit breakers (future)
- Retry with exponential backoff
- Dead letter queues for failed events
- Graceful degradation

