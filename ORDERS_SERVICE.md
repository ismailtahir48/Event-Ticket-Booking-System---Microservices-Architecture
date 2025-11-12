# Orders Service Implementation

## Overview

The Orders Service handles order creation, validation, and cancellation. It decouples order commitment from payment capture, preparing for SAGA flows.

## Database Schema

- **orders**: Order records with status, totals, taxes, fees
- **order_items**: Line items (seats) for each order
- **idempotency_keys**: Ensures idempotent order creation

## Endpoints

### POST /orders
Creates an order from a hold.

**Request:**
```json
{
  "holdId": "hold_123",
  "buyerInfo": {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+90 555 123 4567",
    "orgId": "org_1" // optional
  },
  "idempotencyKey": "order_123_unique" // optional
}
```

**Validations:**
- Hold exists and is active
- Hold has not expired
- Hold belongs to the requesting user (validated via userId)
- Totals match price tiers and taxes

**Response:**
```json
{
  "orderId": "order_123",
  "status": "pending_payment",
  "totalCents": 105000,
  "currency": "TRY",
  "subtotalCents": 100000,
  "serviceFeeCents": 5000,
  "taxCents": 18900,
  "items": [
    {
      "seatId": "seat_1",
      "tier": "VIP",
      "priceCents": 50000
    }
  ]
}
```

### GET /orders/:id
Retrieves order details.

**Response:**
```json
{
  "id": "order_123",
  "userId": "user_1",
  "showtimeId": "showtime_1",
  "status": "pending_payment",
  "totalCents": 105000,
  "currency": "TRY",
  "taxCents": 18900,
  "serviceFeeCents": 5000,
  "createdAt": "2024-01-01T00:00:00Z",
  "items": [...]
}
```

### POST /orders/:id/cancel
Cancels an order (only if status is `pending_payment`).

## Pricing Logic

**Centralized in Orders Service:**
- **Service Fee**: 5% of subtotal
- **Tax Rate**: 18% of (subtotal + service fee)
- **Total**: subtotal + service fee + tax

This ensures deterministic totals across all services.

## Gateway Integration

### Server Actions (`app/actions/orders.ts`)
- `createOrderAction(holdId, buyerInfo, idempotencyKey)`
- `getOrderAction(orderId)`
- `cancelOrderAction(orderId)`

### Checkout Flow

1. **Seat Selection** → User selects seats, holds are created
2. **Checkout Page** (`/checkout?holdIds=hold1,hold2&showtimeId=showtime1`)
   - Shows buyer information form
   - Displays order summary with taxes/fees
   - Creates order on submit
3. **Order Detail** → Redirects to `/orders/{orderId}` after creation

## Setup

1. **Create database:**
```powershell
docker exec app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE orders_db;"
```

2. **Run migrations:**
```powershell
cd services/orders
npm run migrate
```

3. **Start service:**
```powershell
docker-compose up -d orders
```

## Notes

- **Idempotency**: Orders can be safely retried using `idempotencyKey`
- **Hold Validation**: Orders validate that holds are active and not expired
- **Pricing**: All pricing calculations are centralized in Orders Service to avoid inconsistencies
- **Multiple Holds**: Currently uses first holdId; in production, combine multiple holds into a single order

## Next Steps

- [ ] Implement hold combination for multiple seats
- [ ] Add order status webhooks/events
- [ ] Integrate with Payments Service
- [ ] Add order history endpoint

