#!/bin/bash

# Bash script to seed events in catalog database

echo "🌱 Seeding Catalog Database with Events..."

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
PGPASSWORD=postgres psql -h localhost -U postgres -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ PostgreSQL is not running or not accessible!"
    echo "Please start PostgreSQL first: docker-compose up -d postgres"
    exit 1
fi

# Create database if not exists
echo "Creating catalog_db database..."
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE catalog_db;" > /dev/null 2>&1

# Navigate to catalog service
cd services/catalog

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set environment variable
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/catalog_db

# Run migrations
echo "Running migrations..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    cd ../..
    exit 1
fi

# Seed data
echo "Seeding events..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Events seeded successfully!"
    echo "Visit http://localhost:3000 to see the events!"
else
    echo "❌ Seed failed!"
fi

# Go back to root
cd ../..

