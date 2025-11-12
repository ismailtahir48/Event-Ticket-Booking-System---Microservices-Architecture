#!/bin/bash

# Wait for postgres to be ready
echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD=postgres psql -h localhost -U postgres -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 1
done

echo "Creating databases..."

PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE auth_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE directory_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE catalog_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE seatmap_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE inventory_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE orders_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE payments_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE waitlist_db;" 2>/dev/null || true
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE search_db;" 2>/dev/null || true

echo "Databases created successfully!"

