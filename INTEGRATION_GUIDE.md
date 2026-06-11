#!/bin/bash
# ProTech Full-Stack Connection Guide
# This document summarizes all the connection fixes applied between backend and frontend

## ✅ BACKEND INTEGRATION CHECKLIST

### 1. CORS Configuration (server.js)
✓ CORS middleware configured to allow localhost:3000
✓ Credentials enabled for token-based auth
✓ All required HTTP methods and headers allowed
✓ Options endpoint enabled for preflight requests

### 2. Webhook Security (server.js)
✓ Paystack webhook route (/api/payments/webhook) uses raw body parser
✓ express.json() applied AFTER webhook route to prevent parsing conflicts

### 3. Authentication Routes (auth.routes.js)
✓ POST /auth/register - account creation
✓ POST /auth/login - user authentication
✓ GET /auth/profile - protected route to verify token
✓ POST /auth/forgot-password - password recovery
✓ POST /auth/verify-otp - OTP verification

### 4. Payment Routes (payment.routes.js)
✓ GET /payments/verify/:reference - payment verification (protected)
✓ All payment endpoints require verifyToken middleware

### 5. Auth Controller (auth.controller.js)
✓ Register: Returns distinct error messages for email/username conflicts
✓ Tenant accounts set is_approved=0 by default
✓ Landlord accounts set is_approved=1 by default
✓ Login: Blocks unapproved tenants with 403 status
✓ Login: Returns token and user object on success

### 6. Environment Configuration
✓ Backend .env contains all required variables
✓ .env.example provided for team reference
✓ .gitignore includes .env (prevents credentials leaks)

---

## ✅ FRONTEND INTEGRATION CHECKLIST

### 1. Environment Setup (.env)
✓ VITE_API_URL=http://localhost:5001
✓ VITE_PAYSTACK_PUBLIC_KEY configured
✓ VITE_VAPID_PUBLIC_KEY for push notifications

### 2. Vite Configuration (vite.config.js)
✓ Dev server runs on port 3000
✓ Proxy configured: /api requests forward to http://localhost:5001
✓ Environment variables defined for build

### 3. Axios API Client (src/utils/api.js)
✓ Base URL: http://localhost:5001
✓ Request timeout: 15 seconds
✓ Interceptor: Automatically attaches Bearer token from localStorage
✓ Interceptor: Handles 401 responses by clearing storage and redirecting to /login
✓ Error handling: Returns clear error messages to callers

### 4. Auth Context (src/context/AuthContext.jsx)
✓ Persistent user state from localStorage
✓ Token stored as 'protech_token'
✓ User stored as 'protech_user'
✓ Calls GET /auth/profile on app mount to verify token
✓ Logout clears all auth data and redirects to /login

### 5. Login Page (src/pages/public/Login.jsx)
✓ Two tabs: Sign In and Register
✓ Sign In: Email/username + password
✓ Registration form with inline validation:
  - Username: 3+ chars, alphanumeric + underscore
  - Full name: 2+ chars required
  - Email: Valid email format required
  - Phone: 10+ digits required
  - Password: 8+ chars required
  - Confirm password: Must match
✓ Shows yellow banner for unapproved tenant message
✓ Shows blue info banner for successful tenant registration
✓ Landlord registration auto-switches to Sign In tab
✓ Red error text under fields for validation issues
✓ Uses toast notifications for success/failure

### 6. Payment Verify Page (src/pages/public/PaymentVerify.jsx)
✓ Shows loading spinner during 3-second verification wait
✓ On success: Shows confirmation with payment details
✓ On pending: Shows processing message
✓ On error: Shows error message with support CTA
✓ Calls GET /payments/verify/:reference with token
✓ Redirects to /tenant/history on success
✓ Redirects to /tenant/dashboard on pending/error

### 7. Protected Routes (src/App.jsx)
✓ ProtectedRoute component checks user login status
✓ Redirects to /login if not authenticated
✓ Validates user role matches allowedRoles
✓ Renders outlet for nested routes
✓ All landlord routes require landlord/admin role
✓ All tenant routes require tenant role

### 8. Frontend .gitignore
✓ Excludes .env (all variations)
✓ Excludes node_modules, dist, build
✓ Excludes IDE configs and log files

---

## ✅ ROOT CONFIGURATION

### 1. Package.json (root)
✓ npm run install:all - installs dependencies for both projects
✓ npm run backend - starts backend dev server only
✓ npm run frontend - starts frontend dev server only
✓ npm run dev - starts both servers concurrently

### 2. Git Configuration
✓ Root .gitignore prevents accidental commits of sensitive files
✓ Backend and Frontend each have their own .gitignore

---

## 🚀 STARTUP INSTRUCTIONS

### First Time Setup:
```bash
cd /path/to/ProTech\ Cur
npm run install:all
```

### Start Full Stack (Backend + Frontend):
```bash
npm run dev
```

This will start:
- Backend API: http://localhost:5001
- Frontend App: http://localhost:3000
- Frontend proxy: /api → http://localhost:5001

### Start Backend Only:
```bash
npm run backend
```
Runs at: http://localhost:5001

### Start Frontend Only:
```bash
npm run frontend
```
Runs at: http://localhost:3000

---

## ✅ CONNECTION TEST CHECKLIST

After running `npm run dev`, verify each test in order:

| Test # | Endpoint | Expected Status | Expected Result |
|--------|----------|-----------------|-----------------|
| 1 | http://localhost:5001 | 200 | JSON: `{ message: 'Welcome...', status: 'Running smoothly 🚀' }` |
| 2 | http://localhost:5001/api/health | 200 | JSON: `{ status: 'UP', app: 'ProTech' }` |
| 3 | http://localhost:3000 | 200 | ProTech landing page renders |
| 4 | POST /api/auth/register (landlord) | 201 | `{ message: 'Account created...', data: { user_id, ... } }` |
| 5 | POST /api/auth/register (tenant) | 201 | `{ message: '...pending...', data: { user_id, is_approved: 0 } }` |
| 6 | POST /api/auth/login (invalid) | 401 | `{ error: 'Invalid credentials' }` |
| 7 | POST /api/auth/login (unapproved tenant) | 403 | `{ error: 'Your account is pending landlord approval...' }` |
| 8 | POST /api/auth/login (valid) | 200 | `{ token, user: { id, email, role, is_approved } }` |
| 9 | GET /api/auth/profile (no token) | 401 | Unauthorized |
| 10 | GET /api/auth/profile (with token) | 200 | `{ user: { id, email, role, full_name, ... } }` |
| 11 | Frontend: Register new landlord | - | Email prefilled in Sign In tab |
| 12 | Frontend: Register new tenant | - | Blue info banner shows approval message |
| 13 | Frontend: Login with token | - | Redirects to correct dashboard |
| 14 | Frontend: Navigate to /landlord/dashboard (logged out) | - | Redirects to /login |
| 15 | Frontend: Payment redirect with reference | - | Shows verification UI |

---

## 📝 KEY FEATURES IMPLEMENTED

✅ User Registration (Landlord & Tenant)
✅ JWT-based Authentication
✅ Role-based Access Control
✅ Email/Username Login
✅ Unapproved Tenant Protection
✅ Password Reset Flow
✅ Payment Verification
✅ Protected Routes
✅ Token Persistence
✅ Automatic 401 Logout
✅ Real-time Validation
✅ CORS Support
✅ PWA Ready
✅ Service Worker Registered
✅ Responsive UI (Tailwind CSS)

---

## 🔧 TROUBLESHOOTING

**Frontend can't connect to backend:**
→ Ensure backend is running on port 5001
→ Check vite.config.js proxy settings
→ Clear browser cache and restart

**Token not persisting:**
→ Check localStorage in browser DevTools
→ Verify login response includes token
→ Ensure API interceptor is running

**CORS errors:**
→ Backend CORS must allow http://localhost:3000
→ Check server.js corsOptions configuration
→ Restart backend after changes

**Payment verification fails:**
→ Wait 3+ seconds before checking (webhook delay)
→ Verify reference parameter is in URL
→ Check backend payment.controller.js implementation

**Emails not sending:**
→ Configure EMAIL_* variables in .env
→ Use Gmail app password (not regular password)
→ Enable less secure apps if needed

---

## 📞 SUPPORT CONTACTS

Student: Amoo Halleluyah | 241295 | SQI College of ICT, Ogbomoso
Project: ProTech - Automated Rent Tracking & Notification System
