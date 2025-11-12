# Quick Start Guide - Authentication

## ✅ Step 1: Docker Containers (DONE)
Containers are running: postgres, redis, rabbitmq

## ✅ Step 2: Database Setup (DONE)
- Database `auth_db` exists
- Tables migrated
- Test users seeded

## 📋 Step 3: Start Auth Service

**Open Terminal 1:**
```powershell
cd services/auth
$env:DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/auth_db"
$env:PORT = "3001"
$env:JWT_SECRET = "your-secret-key-change-in-production-use-rsa-keys"
$env:CORS_ORIGIN = "http://localhost:3000"
npm run dev
```

**Expected output:**
```
Auth Service - JWT_SECRET loaded: your-secre...
Auth service running on port 3001
```

**Keep this terminal open!**

---

## 📋 Step 4: Start Gateway

**Open Terminal 2 (NEW TERMINAL):**
```powershell
cd C:\Users\Tahir\Desktop\NEXTJSAPPSTACK6\app-stack6
npm run dev
```

**Expected output:**
```
Gateway - JWT_SECRET loaded: your-secre...
▲ Next.js 16.0.1
- Local:        http://localhost:3000
```

**Keep this terminal open!**

---

## 🧪 Step 5: Test Registration

1. Open browser: http://localhost:3000/register
2. Fill in:
   - Email: `newuser@test.com`
   - Password: `password123`
3. Click "Create Account"

**Expected:**
- ✅ Toast: "Account created!"
- ✅ Redirected to homepage
- ✅ Login/Register buttons **DISAPPEAR**
- ✅ Your email appears in header
- ✅ Logout button appears

**Check Terminal 1 (Auth Service):**
- Should see: `🔐 TOKEN GENERATED:`
- Should see user email

**Check Terminal 2 (Gateway):**
- Should see: `🔍 TOKEN VERIFICATION:`
- Should see: `✅ TOKEN VERIFIED SUCCESSFULLY:`

---

## 🧪 Step 6: Test Login

1. Click logout (if logged in)
2. Go to: http://localhost:3000/login
3. Login with:
   - Email: `customer@test.com`
   - Password: `password123`
4. Click "Login"

**Expected:**
- ✅ Toast: "Welcome back!"
- ✅ Redirected to homepage
- ✅ Login/Register buttons **DISAPPEAR**
- ✅ Email `customer@test.com` appears in header
- ✅ Logout button appears

---

## ✅ Success Checklist

After login, verify:
- [ ] Login button is **NOT visible**
- [ ] Register button is **NOT visible**
- [ ] Your email **IS visible** in header
- [ ] Logout button **IS visible**
- [ ] No errors in browser console
- [ ] No errors in terminals

---

## 🐛 Troubleshooting

### Login/Register buttons still visible?
1. Check browser console (F12) for errors
2. Check Gateway terminal for JWT verification logs
3. Verify JWT_SECRET matches in both terminals
4. Clear browser cookies and try again

### "Invalid token" error?
- Check both terminals show same JWT_SECRET (first 10 chars)
- Restart both services
- Make sure `.env.local` files have identical JWT_SECRET

### Auth Service not responding?
- Check Terminal 1 shows "Auth service running on port 3001"
- Test: `Invoke-WebRequest -Uri "http://localhost:3001/health"`

