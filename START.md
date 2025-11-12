# Starting the System

## Current Status

✅ **Gateway dependencies installed**
✅ **Next.js dev server starting** (check http://localhost:3000)

## To Complete Setup

### 1. Start Docker Services (if Docker is available)

```bash
# Start infrastructure
docker-compose up -d postgres redis rabbitmq

# Wait for services to be ready (about 10 seconds)
# Then start all services
docker-compose up -d
```

### 2. Create Databases

If using Docker, create databases:
```bash
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE auth_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE inventory_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE catalog_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE seatmap_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE orders_db;"
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE payments_db;"
```

### 3. Run Migrations

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

### 4. Test the System

1. **UI**: Open http://localhost:3000
2. **Health Checks**:
   - Auth: http://localhost:3001/health
   - Inventory: http://localhost:3005/health

## What's Working Now

- ✅ Next.js Gateway UI (landing page, seatmap, checkout, orders)
- ✅ Basic service structure
- ✅ Database migration scripts
- ✅ Docker Compose configuration

## What Needs Setup

- ⏳ Docker Desktop (if not running)
- ⏳ Database initialization
- ⏳ Service dependencies installation
- ⏳ RabbitMQ event consumers
- ⏳ WebSocket client integration

## Quick Test (UI Only)

Even without services running, you can:
1. Visit http://localhost:3000
2. See the UI components
3. Navigate between pages
4. Test the seatmap interface

The services will return errors, but the UI will still render.

