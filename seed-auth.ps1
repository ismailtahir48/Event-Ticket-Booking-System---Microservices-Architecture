# PowerShell script to seed auth database

Write-Host "🌱 Seeding Auth Database..." -ForegroundColor Green

# Check if PostgreSQL is running
Write-Host "Checking PostgreSQL connection..." -ForegroundColor Yellow
$env:PGPASSWORD = "postgres"
$testConnection = & psql -h localhost -U postgres -c "SELECT 1;" 2>&1

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ PostgreSQL is not running or not accessible!" -ForegroundColor Red
    Write-Host "Please start PostgreSQL first: docker-compose up -d postgres" -ForegroundColor Yellow
    exit 1
}

# Create database if not exists
Write-Host "Creating auth_db database..." -ForegroundColor Yellow
& psql -h localhost -U postgres -c "CREATE DATABASE auth_db;" 2>&1 | Out-Null

# Navigate to auth service
Set-Location services/auth

# Install dependencies if needed
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Set environment variable
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auth_db"

# Run migrations
Write-Host "Running migrations..." -ForegroundColor Yellow
npm run migrate

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Migration failed!" -ForegroundColor Red
    Set-Location ../..
    exit 1
}

# Seed data
Write-Host "Seeding test users..." -ForegroundColor Yellow
npm run seed

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Auth database seeded successfully!" -ForegroundColor Green
    Write-Host "Test users created:" -ForegroundColor Cyan
    Write-Host "  - customer@test.com / password123 (customer)" -ForegroundColor Cyan
    Write-Host "  - staff@test.com / password123 (staff)" -ForegroundColor Cyan
    Write-Host "  - owner@test.com / password123 (owner)" -ForegroundColor Cyan
} else {
    Write-Host "❌ Seed failed!" -ForegroundColor Red
}

# Go back to root
Set-Location ../..

