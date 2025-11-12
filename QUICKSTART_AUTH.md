# Quick Auth Setup

## Step 1: Setup Auth Database

```powershell
# Create database
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE auth_db;"

# Run seed script
.\seed-auth.ps1
```

## Step 2: Start Auth Service

```powershell
cd services/auth
npm install

# Create .env file:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
# PORT=3001
# JWT_SECRET=your-secret-key-change-in-production
# CORS_ORIGIN=http://localhost:3000

npm run dev
```

## Step 3: Test

1. Visit http://localhost:3000/register
2. Create account OR login with:
   - `customer@test.com` / `password123`
3. You should see your email in the header!

## Test Users

After seeding:
- `customer@test.com` / `password123` (customer)
- `staff@test.com` / `password123` (staff)  
- `owner@test.com` / `password123` (owner)

