# Authentication Setup - Step by Step Guide

## Step 1: Start Docker Containers

```powershell
# Make sure you're in the root directory (app-stack6)
docker-compose up -d postgres redis rabbitmq
```

Wait 10-15 seconds for PostgreSQL to be ready.

**Verify:**
```powershell
docker ps
```
You should see `postgres`, `redis`, and `rabbitmq` containers running.

---

## Step 2: Create Auth Database

```powershell
docker exec -it app-stack6-postgres-1 psql -U postgres -c "CREATE DATABASE auth_db;"
```

**Verify:**
```powershell
docker exec -it app-stack6-postgres-1 psql -U postgres -c "\l" | findstr auth_db
```
You should see `auth_db` in the list.

---

## Step 3: Setup Auth Service Environment

```powershell
cd services/auth
```

Create `.env.local` file (if it doesn't exist):
```powershell
@"
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auth_db
PORT=3001
JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys
CORS_ORIGIN=http://localhost:3000
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**Verify the file:**
```powershell
Get-Content .env.local
```

---

## Step 4: Install Auth Service Dependencies

```powershell
npm install
```

---

## Step 5: Run Database Migration

```powershell
npm run migrate
```

**Expected output:**
```
Auth database migrated successfully
```

---

## Step 6: Seed Test Users

```powershell
npm run seed
```

**Expected output:**
```
✅ Seeded 3 test users
Test users:
  - customer@test.com / password123 (customer)
  - staff@test.com / password123 (staff)
  - owner@test.com / password123 (owner)
```

---

## Step 7: Start Auth Service

**Keep this terminal open!**

```powershell
npm run dev
```

**Expected output:**
```
Auth service running on port 3001
Auth Service - JWT_SECRET loaded: your-secre...
```

**Verify it's working:**
Open a new terminal and run:
```powershell
Invoke-WebRequest -Uri "http://localhost:3001/health" -UseBasicParsing
```
Should return: `{"status":"ok"}`

---

## Step 8: Setup Gateway Environment

**Open a NEW terminal** (keep Auth Service running in the first one)

```powershell
# Go back to root directory
cd ../..
```

Create `.env.local` in root directory:
```powershell
@"
JWT_SECRET=your-secret-key-change-in-production-use-rsa-keys
AUTH_SERVICE_URL=http://localhost:3001
CATALOG_SERVICE_URL=http://localhost:3003
"@ | Out-File -FilePath .env.local -Encoding utf8
```

**⚠️ CRITICAL: JWT_SECRET must be EXACTLY the same in both files!**

**Verify:**
```powershell
Get-Content .env.local
```

---

## Step 9: Install Gateway Dependencies

```powershell
npm install --legacy-peer-deps
```

---

## Step 10: Start Gateway

**Keep this terminal open!**

```powershell
npm run dev
```

**Expected output:**
```
Gateway - JWT_SECRET loaded: your-secre...
▲ Next.js 16.0.1
- Local:        http://localhost:3000
```

**Verify:**
- Open browser: http://localhost:3000
- You should see the homepage

---

## Step 11: Test Registration

1. Go to: http://localhost:3000/register
2. Fill in:
   - Email: `test@example.com`
   - Password: `password123`
   - Role: `customer` (default)
3. Click "Create Account"

**Expected:**
- Toast message: "Account created!"
- Redirected to homepage
- Login/Register buttons should DISAPPEAR
- You should see your email in the header

**Check Auth Service terminal:**
- Should see: `🔐 TOKEN GENERATED:`
- Should see user email and token info

**Check Gateway terminal:**
- Should see: `🔍 TOKEN VERIFICATION:`
- Should see: `✅ TOKEN VERIFIED SUCCESSFULLY:`

---

## Step 12: Test Login

1. Click logout (if logged in)
2. Go to: http://localhost:3000/login
3. Login with test user:
   - Email: `customer@test.com`
   - Password: `password123`
4. Click "Login"

**Expected:**
- Toast message: "Welcome back!"
- Redirected to homepage
- Login/Register buttons should DISAPPEAR
- You should see `customer@test.com` in the header
- Logout button should appear

---

## Step 13: Verify Authentication State

**After login, check:**

1. **Browser Console (F12):**
   - Should see: `Auth check response: 200 OK`
   - Should see: `User data received: {email: "...", role: "..."}`

2. **Header:**
   - Login button: ❌ NOT visible
   - Register button: ❌ NOT visible
   - User email: ✅ Visible
   - Logout button: ✅ Visible

3. **Network Tab:**
   - `/api/auth/me` request should return 200
   - Response should contain user data

---

## Troubleshooting

### Issue: Login/Register buttons still visible after login

**Check:**
1. Browser console for errors
2. Gateway terminal for JWT verification logs
3. Compare JWT_SECRET in both terminals (should match)

**Fix:**
- Restart both services
- Clear browser cookies
- Check JWT_SECRET values match exactly

### Issue: "Invalid token" error

**Check:**
- Auth Service terminal: JWT_SECRET value
- Gateway terminal: JWT_SECRET value
- They must be EXACTLY the same

**Fix:**
- Update `.env.local` files to have identical JWT_SECRET
- Restart both services

### Issue: "No token found in cookies"

**Check:**
- Login action completed successfully
- Cookie was set (check Network tab → Response Headers)

**Fix:**
- Clear cookies and try again
- Check browser allows cookies

---

## Success Criteria

✅ You can register a new account
✅ You can login with existing account
✅ After login, Login/Register buttons disappear
✅ After login, you see your email in header
✅ After login, logout button appears
✅ JWT tokens are generated and verified correctly
✅ No console errors

---

## Next Steps

Once authentication is working:
1. Test logout functionality
2. Test protected routes (should redirect to login)
3. Test different user roles (customer, staff, owner)

