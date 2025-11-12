# Populate Seats - Quick Guide

## Step 1: Ensure Database is Set Up

```powershell
# Create database (if not exists)
docker exec app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE seatmap_db;"

# Run migrations
cd services/seatmap
npm run migrate
```

## Step 2: Seed the Seatmap

```powershell
cd services/seatmap
npm run seed
```

This will create:
- **3 Sections**: Section A (VIP), Section B (Standard), Section C (Balcony/Economy)
- **Total 290 seats**:
  - Section A: 50 seats (5 rows × 10 seats) - VIP tier
  - Section B: 96 seats (8 rows × 12 seats) - Standard tier
  - Section C: 90 seats (6 rows × 15 seats) - Economy tier
- **Venue ID**: `venue_1`

## Step 3: Use the Seatmap

When creating a showtime in the Catalog Service, use `venueId: "venue_1"`.

Then navigate to the seat selection page - you should see all the seats!

## Alternative: Create Seats via API

You can also create seats programmatically:

```powershell
# Create a section
curl -X POST http://localhost:3004/venues/venue_1/sections \
  -H "Content-Type: application/json" \
  -d '{"name": "Section A", "orderIndex": 0}'

# Create seats (bulk)
curl -X POST http://localhost:3004/sections/{sectionId}/seats/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "seats": [
      {"row": "1", "number": "1", "tier": "VIP", "accessible": false},
      {"row": "1", "number": "2", "tier": "VIP", "accessible": false}
    ]
  }'
```

## Verify

After seeding, test the seatmap endpoint:

```powershell
curl http://localhost:3004/seatmap?venueId=venue_1
```

You should see all sections and seats in the response.

