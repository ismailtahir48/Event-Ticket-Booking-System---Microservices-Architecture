# Seatmap Service Setup

## 1. Create the Database

First, ensure the database exists:

```powershell
docker exec app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE seatmap_db;"
```

## 2. Create `.env.local` File

In `services/seatmap/`, create `.env.local`:

```powershell
cd services/seatmap
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/seatmap_db
CORS_ORIGIN=http://localhost:3000
PORT=3004
"@ | Out-File -FilePath .env.local -Encoding utf8
```

## 3. Install Dependencies

```powershell
npm install
```

## 4. Run Migrations

```powershell
npm run migrate
```

This will create the `sections` and `seats` tables.

## 5. Start the Service

```powershell
npm run dev
```

Expected output:
```
✅ Seatmap Service - DATABASE_URL loaded
Seatmap service running on port 3004
```

## 6. Verify

Test the health endpoint:
```powershell
curl http://localhost:3004/health
```

Should return: `{"status":"ok"}`

## Database Structure

- **sections**: Venue sections (e.g., "Section A", "Balcony")
- **seats**: Individual seats with row, number, tier, accessibility flags

## Next Steps

1. Create a seatmap via API or organizer UI
2. Test the seat selection page at `/events/[id]/[showtimeId]`

