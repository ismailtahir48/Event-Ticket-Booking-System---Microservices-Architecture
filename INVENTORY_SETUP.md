# Inventory Service Setup

## Overview

The Inventory Service manages seat holds, prevents overselling, and provides real-time availability. It uses:
- **PostgreSQL** for persistent state
- **Redis** for distributed locks
- **RabbitMQ** for event publishing
- **TTL Worker** to automatically expire holds

## Setup Steps

### 1. Create Database

```powershell
docker exec app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE inventory_db;"
```

### 2. Create `.env.local` File

In `services/inventory/`, create `.env.local`:

```powershell
cd services/inventory
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/inventory_db
REDIS_URL=redis://localhost:6379
RABBITMQ_URL=amqp://guest:guest@localhost:5672
CORS_ORIGIN=http://localhost:3000
PORT=3005
HOLD_TTL_SECONDS=300
"@ | Out-File -FilePath .env.local -Encoding utf8
```

### 3. Install Dependencies

```powershell
npm install
```

### 4. Run Migrations

```powershell
npm run migrate
```

This creates:
- `seat_states` table (seat state machine)
- `holds` table (active holds with idempotency)
- Indexes for performance

### 5. Start the Service

```powershell
npm run dev
```

Expected output:
```
✅ Inventory Service - DATABASE_URL loaded
✅ Inventory Service - Redis connected
✅ Inventory Service - RabbitMQ connected
✅ Hold expiration worker started (runs every 30s)
Inventory service running on port 3005
Hold TTL: 300 seconds (5 minutes)
```

## Key Features

### Distributed Locks (Redis)
- Prevents overselling: `SET lock:showtimeId:seatId NX EX 300`
- Atomic operation ensures only one hold per seat

### Idempotency
- `POST /hold` accepts `idempotencyKey` header
- Prevents duplicate holds from retries

### TTL Worker
- Runs every 30 seconds
- Automatically expires holds past their TTL
- Releases locks and updates seat states
- Publishes `hold.expired` events

### Event Publishing
- `hold.created` → When seat is held
- `hold.expired` → When hold expires
- `seats.purchased` → When hold converts to purchase

## API Endpoints

### POST /hold
Create a hold for seats.

**Request:**
```json
{
  "showtimeId": "showtime_123",
  "seatIds": ["seat_1", "seat_2"],
  "userId": "user_456",
  "idempotencyKey": "optional-key"
}
```

**Response:**
```json
{
  "holdId": "hold_789",
  "expiresAt": "2024-01-01T12:05:00Z",
  "seatIds": ["seat_1", "seat_2"]
}
```

### POST /release
Release a hold.

**Request:**
```json
{
  "holdId": "hold_789"
}
```

### GET /availability?showtimeId=...
Get current seat availability for a showtime.

**Response:**
```json
{
  "showtimeId": "showtime_123",
  "availability": [
    { "seatId": "seat_1", "state": "held", "holdExpiresAt": "2024-01-01T12:05:00Z" },
    { "seatId": "seat_2", "state": "available" }
  ]
}
```

## Testing Oversell Prevention

1. Open two browser windows
2. Navigate to the same showtime seat selection page
3. Try to select the same seat in both windows
4. **Expected**: One succeeds, the other shows "Seat unavailable"

## WebSocket Integration

The WebSocket Service listens to Inventory events and broadcasts to subscribed clients:

- Connect: `ws://localhost:3011?showtimeId=showtime_123`
- Subscribe: `{ "type": "subscribe", "showtimeId": "showtime_123" }`
- Receive: `{ "type": "hold.created", "showtimeId": "...", "seatIds": [...] }`

## Next Steps

1. Test hold creation and expiration
2. Verify oversell prevention with concurrent requests
3. Check WebSocket real-time updates
4. Integrate with Orders Service for purchase conversion

