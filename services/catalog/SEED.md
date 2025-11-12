# Catalog Service - Seed Data

## Quick Start

1. **Ensure PostgreSQL is running**
   ```bash
   docker-compose up -d postgres
   ```

2. **Create the catalog database** (if not exists)
   ```bash
   docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE catalog_db;"
   ```

3. **Set environment variable**
   ```bash
   export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db
   ```
   
   Or create `.env` file in `services/catalog/`:
   ```
   DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db
   ```

4. **Run migrations**
   ```bash
   cd services/catalog
   npm install
   npm run migrate
   ```

5. **Seed the database**
   ```bash
   npm run seed
   ```

## What Gets Seeded

- **6 Sample Events**: Rock Concert, Classical Symphony, Comedy Show, Theater, Jazz Night, Dance Performance
- **18 Showtimes**: 3 showtimes per event with different dates/times
- **54 Price Tiers**: VIP, Standard, and Economy tiers for each showtime

## Verify

Check the events at:
- API: http://localhost:3003/events
- UI: http://localhost:3000

