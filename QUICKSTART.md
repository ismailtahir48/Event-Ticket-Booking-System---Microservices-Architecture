# Quick Start Guide

## Option 1: Run Gateway Only (UI Testing)

If you just want to see the UI without the full microservices stack:

```bash
# Install dependencies
npm install --legacy-peer-deps

# Start the Next.js dev server
npm run dev
```

Visit `http://localhost:3000` to see the UI.

**Note**: The services will return mock data or errors since they're not running. This is fine for UI development.

## Option 2: Full Stack (Requires Docker)

### Step 0: Seed Event Data (IMPORTANT!)

Before you can see events, you need to seed the catalog database:

```bash
# 1. Create catalog database
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE catalog_db;"

# 2. Navigate to catalog service
cd services/catalog

# 3. Install dependencies
npm install

# 4. Set database URL (or create .env file)
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db

# 5. Run migrations
npm run migrate

# 6. Seed data
npm run seed

# 7. Go back to root
cd ../..
```

Now you'll see 6 sample events on the homepage!

### Prerequisites
1. Install Docker Desktop and ensure it's running
2. Install Node.js 20+

### Steps

1. **Start Infrastructure**
```bash
docker-compose up -d postgres redis rabbitmq
```

2. **Wait for services to be healthy** (about 10-20 seconds)
```bash
docker-compose ps
```

3. **Create Databases** (if needed)
```bash
# On Windows PowerShell
.\init-databases.ps1

# On Linux/Mac
chmod +x init-databases.sh
./init-databases.sh
```

Or manually:
```bash
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE auth_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE inventory_db;"
# ... repeat for other databases
```

4. **Start All Services**
```bash
docker-compose up -d
```

5. **Run Migrations** (for services that need it)
```bash
# Auth service
cd services/auth
npm install
npm run migrate

# Inventory service
cd ../inventory
npm install
npm run migrate
```

6. **Start Gateway**
```bash
cd ../..
npm run dev
```

## Option 3: Run Services Locally (Development)

Instead of Docker, run services locally:

1. **Start Infrastructure** (PostgreSQL, Redis, RabbitMQ)
   - Use Docker for these: `docker-compose up -d postgres redis rabbitmq`
   - Or install locally

2. **Set Environment Variables**
   Create `.env` files in each service directory:
   ```env
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
   PORT=3001
   ```

3. **Start Each Service**
   ```bash
   cd services/auth
   npm install
   npm run dev
   ```

4. **Start Gateway**
   ```bash
   npm run dev
   ```

## Troubleshooting

### Docker Not Running
- Start Docker Desktop
- Wait for it to fully start
- Try `docker ps` to verify

### Port Already in Use
- Change ports in `docker-compose.yml`
- Or stop the conflicting service

### Database Connection Errors
- Ensure PostgreSQL is running: `docker-compose ps`
- Check database exists: `docker exec -it app-stack6-postgres-1 psql -U postgres -l`
- Verify connection string in service `.env` files

### Service Won't Start
- Check logs: `docker-compose logs <service-name>`
- Verify dependencies installed: `cd services/<service> && npm install`
- Check TypeScript compilation: `npm run build`

## Testing the System

1. **UI**: Visit `http://localhost:3000`
2. **Auth Service**: `http://localhost:3001/health`
3. **Inventory Service**: `http://localhost:3005/health`
4. **RabbitMQ Management**: `http://localhost:15672` (guest/guest)

## Next Steps

- Implement full RabbitMQ event consumers
- Add WebSocket client to gateway
- Complete database migrations for all services
- Add authentication flow
- Implement real-time seat updates

