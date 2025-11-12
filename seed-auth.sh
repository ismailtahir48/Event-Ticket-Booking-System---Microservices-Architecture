#!/bin/bash

# Bash script to seed auth database

echo "🌱 Seeding Auth Database..."

# Check if PostgreSQL is running
echo "Checking PostgreSQL connection..."
PGPASSWORD=postgres psql -h localhost -U postgres -c "SELECT 1;" > /dev/null 2>&1

if [ $? -ne 0 ]; then
    echo "❌ PostgreSQL is not running or not accessible!"
    echo "Please start PostgreSQL first: docker-compose up -d postgres"
    exit 1
fi

# Create database if not exists
echo "Creating auth_db database..."
PGPASSWORD=postgres psql -h localhost -U postgres -c "CREATE DATABASE auth_db;" > /dev/null 2>&1

# Navigate to auth service
cd services/auth

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Set environment variable
export DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db

# Run migrations
echo "Running migrations..."
npm run migrate

if [ $? -ne 0 ]; then
    echo "❌ Migration failed!"
    cd ../..
    exit 1
fi

# Seed data
echo "Seeding test users..."
npm run seed

if [ $? -eq 0 ]; then
    echo "✅ Auth database seeded successfully!"
    echo "Test users created:"
    echo "  - customer@test.com / password123 (customer)"
    echo "  - staff@test.com / password123 (staff)"
    echo "  - owner@test.com / password123 (owner)"
else
    echo "❌ Seed failed!"
fi

# Go back to root
cd ../..

