# Catalog Service Setup

## Issue: "Failed to fetch events"

The Catalog Service is running but cannot connect to the database because `DATABASE_URL` is not set.

## Quick Fix

1. **Create `.env.local` file in `services/catalog/`:**

```powershell
cd services/catalog
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db
CORS_ORIGIN=http://localhost:3000
PORT=3003
"@ | Out-File -FilePath .env.local -Encoding utf8
```

2. **Ensure the database exists:**

```powershell
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE catalog_db;"
```

3. **Run migrations:**

```powershell
cd services/catalog
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catalog_db"
npm run migrate
```

4. **Seed the database (optional):**

```powershell
npm run seed
```

5. **Restart the Catalog Service:**

The service should automatically reload with the new `.env.local` file. If not, restart it:

```powershell
# Stop the service (Ctrl+C) and restart:
cd services/catalog
npm run dev
```

## Verify

Test the endpoint:
```powershell
curl http://localhost:3003/events
```

You should see a JSON response with events (or an empty array if not seeded).

## Alternative: Set Environment Variable Directly

If you prefer not to use `.env.local`, set the environment variable before starting the service:

```powershell
cd services/catalog
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catalog_db"
npm run dev
```

