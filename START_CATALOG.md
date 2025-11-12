# Start Catalog Service

## The Issue

The Catalog Service is not running, which is why you're getting "fetch failed" errors.

## Quick Start

**Open a NEW terminal** (keep Gateway running in the first one):

```powershell
cd services/catalog
```

**1. Create `.env.local` file (if not exists):**

```powershell
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db
CORS_ORIGIN=http://localhost:3000
PORT=3003
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**2. Install dependencies (if not done):**

```powershell
npm install
```

**3. Run migrations (if database tables don't exist):**

```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catalog_db"
npm run migrate
```

**4. Start the Catalog Service:**

```powershell
npm run dev
```

**Expected output:**
```
Catalog service running on port 3003
```

**5. Verify it's working:**

Open another terminal and test:
```powershell
curl http://localhost:3003/health
```

Should return: `{"status":"ok"}`

**6. (Optional) Seed sample events:**

In the Catalog Service terminal, stop it (Ctrl+C) and run:
```powershell
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/catalog_db"
npm run seed
```

Then restart:
```powershell
npm run dev
```

## Verify Events Endpoint

```powershell
curl http://localhost:3003/events
```

Should return JSON with events (or empty array `{"events":[]}` if not seeded).

## Now Refresh Your Browser

Go back to http://localhost:3000 - the events should load now!

