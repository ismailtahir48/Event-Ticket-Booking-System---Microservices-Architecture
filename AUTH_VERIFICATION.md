# Authentication System Verification

## How Authentication Works

1. **User logs in** → Auth Service validates credentials → Returns JWT token
2. **Gateway receives token** → Stores in httpOnly cookie
3. **UserMenu component** → Fetches `/api/auth/me` → Gateway verifies JWT → Returns user data
4. **UI updates** → Shows user email and logout button

## Critical: JWT_SECRET Must Match

The **Auth Service** and **Next.js Gateway** must use the **SAME** `JWT_SECRET`:

### Auth Service (.env.local in `services/auth/`)
```
JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys
```

### Next.js Gateway (.env.local in root)
```
JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys
AUTH_SERVICE_URL=http://localhost:3001
```

## Verification Steps

### 1. Check Auth Service is Running
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
# Should return: {"status":"ok"}
```

### 2. Test Login API Directly
```powershell
$body = @{
    email = "customer@test.com"
    password = "password123"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
$response.Content
# Should return: {"token":"...", "user":{...}}
```

### 3. Check Cookie is Set
After logging in via the UI:
- Open browser DevTools (F12)
- Go to Application/Storage tab
- Check Cookies → `http://localhost:3000`
- Look for `auth-token` cookie

### 4. Test /api/auth/me Endpoint
```powershell
# First, get token from login
$loginBody = @{
    email = "customer@test.com"
    password = "password123"
} | ConvertTo-Json

$loginResponse = Invoke-WebRequest -Uri "http://localhost:3001/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -UseBasicParsing
$token = ($loginResponse.Content | ConvertFrom-Json).token

# Then test the gateway endpoint
$headers = @{
    "Authorization" = "Bearer $token"
}
Invoke-WebRequest -Uri "http://localhost:3000/api/auth/me" -Headers $headers -UseBasicParsing
# Should return user data
```

## Troubleshooting

### Login buttons still visible after login

**Cause**: UserMenu component not detecting auth state

**Fix**: 
1. Check browser console for errors
2. Verify `/api/auth/me` returns user data
3. Check JWT_SECRET matches in both services
4. Clear cookies and try again

### "Invalid token" error

**Cause**: JWT_SECRET mismatch between services

**Fix**: Ensure both `.env.local` files have the same `JWT_SECRET` value

### Auth service not responding

**Cause**: Service not running or wrong port

**Fix**: 
```powershell
cd services/auth
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auth_db"
npm run dev
```

## Current Flow

```
User clicks Login
  ↓
AuthForm submits → loginAction()
  ↓
Auth Service validates → Returns JWT token
  ↓
Gateway sets cookie (httpOnly, secure)
  ↓
Redirect to home page
  ↓
UserMenu useEffect runs → Fetches /api/auth/me
  ↓
Gateway verifies JWT → Returns user data
  ↓
UserMenu shows email + logout button
```

## Environment Variables Checklist

- [ ] Auth Service has `JWT_SECRET` in `.env.local`
- [ ] Gateway has `JWT_SECRET` in `.env.local` (root directory)
- [ ] Both `JWT_SECRET` values are **identical**
- [ ] Gateway has `AUTH_SERVICE_URL=http://localhost:3001`
- [ ] Auth Service has `DATABASE_URL` pointing to `auth_db`

