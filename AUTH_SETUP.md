# Auth Service Setup Guide

## Quick Setup

### 1. Create Database

```powershell
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE auth_db;"
```

### 2. Run Seed Script

```powershell
.\seed-auth.ps1
```

Or manually:

```powershell
cd services/auth
npm install
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auth_db"
npm run migrate
npm run seed
cd ../..
```

### 3. Start Auth Service

```powershell
cd services/auth
# Create .env file with:
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
# PORT=3001
# JWT_SECRET=your-secret-key-change-in-production
# CORS_ORIGIN=http://localhost:3000

npm run dev
```

Keep this running on port 3001.

### 4. Test Authentication

1. Visit http://localhost:3000/register
2. Create a new account OR use test users:
   - `customer@test.com` / `password123` (customer)
   - `staff@test.com` / `password123` (staff)
   - `owner@test.com` / `password123` (owner)
3. Login at http://localhost:3000/login
4. You should see your email in the header when logged in

## Test Users (from seed)

After running the seed script, you can use these test accounts:

- **Customer**: `customer@test.com` / `password123`
- **Staff**: `staff@test.com` / `password123`
- **Owner**: `owner@test.com` / `password123`

## Features

✅ Password hashing with bcrypt
✅ JWT token generation (HS256 for demo, RS256 ready for production)
✅ Cookie-based session management
✅ Protected routes middleware
✅ User menu in header
✅ Login/Register pages
✅ Auto-login after registration

## API Endpoints

- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user (requires Bearer token)
- `GET /.well-known/jwks.json` - JWKS endpoint (for RS256)
- `GET /health` - Health check

## Next Steps

- Add refresh token flow
- Implement RS256 with proper RSA keys
- Add password reset functionality
- Add email verification

