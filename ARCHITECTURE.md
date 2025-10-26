# System Architecture

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend (React)                         │
│                    http://localhost:5173                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  LoginUpdated    │  │ SignUpUpdated    │  │ GoogleCallback│ │
│  │   Component      │  │   Component      │  │  Component   │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │           │
│           └─────────────────────┼────────────────────┘           │
│                                 │                                │
│                    ┌────────────▼────────────┐                  │
│                    │   API Service (api.ts)  │                  │
│                    │   - HTTP requests       │                  │
│                    │   - Token management    │                  │
│                    │   - Error handling      │                  │
│                    └────────────┬────────────┘                  │
│                                 │                                │
│                    ┌────────────▼────────────┐                  │
│                    │ reCAPTCHA Service       │                  │
│                    │ - Load script           │                  │
│                    │ - Execute token         │                  │
│                    └────────────┬────────────┘                  │
│                                 │                                │
└─────────────────────────────────┼────────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Google reCAPTCHA API     │
                    │   - Bot detection          │
                    │   - Score verification     │
                    └────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   Google OAuth API         │
                    │   - User authentication    │
                    │   - Profile data           │
                    └────────────────────────────┘
                                  │
                    ┌─────────────▼──────────────┐
                    │   CORS Proxy (Backend)     │
                    └────────────┬───────────────┘
                                 │
┌────────────────────────────────┼──────────────────────────────────┐
│                    Backend (Node.js/Express)                      │
│                    http://localhost:5000                          │
├────────────────────────────────┼──────────────────────────────────┤
│                                │                                  │
│                    ┌───────────▼────────────┐                    │
│                    │  Express Server        │                    │
│                    │  - CORS enabled        │                    │
│                    │  - Session management  │                    │
│                    │  - Passport setup      │                    │
│                    └───────────┬────────────┘                    │
│                                │                                  │
│        ┌───────────────────────┼───────────────────────┐         │
│        │                       │                       │         │
│   ┌────▼────────┐      ┌──────▼──────┐      ┌────────▼────┐    │
│   │ Auth Routes │      │ User Routes │      │ Middleware  │    │
│   │             │      │             │      │             │    │
│   │ - signup    │      │ - getAll    │      │ - JWT auth  │    │
│   │ - login     │      │ - getById   │      │ - reCAPTCHA │    │
│   │ - verify    │      │ - update    │      │ - errors    │    │
│   │ - google    │      │ - pending   │      │             │    │
│   │ - forgot    │      │ - approve   │      │             │    │
│   │ - reset     │      │ - decline   │      │             │    │
│   └────┬────────┘      └──────┬──────┘      └────────┬────┘    │
│        │                      │                      │          │
│        └──────────────────────┼──────────────────────┘          │
│                               │                                  │
│                    ┌──────────▼──────────┐                      │
│                    │  Services Layer     │                      │
│                    │                     │                      │
│                    │ - emailService      │                      │
│                    │ - passport config   │                      │
│                    │ - error handling    │                      │
│                    └──────────┬──────────┘                      │
│                               │                                  │
│                    ┌──────────▼──────────┐                      │
│                    │  Database Layer     │                      │
│                    │                     │                      │
│                    │ - User model        │                      │
│                    │ - PasswordReset     │                      │
│                    │ - In-memory DB      │                      │
│                    └──────────┬──────────┘                      │
│                               │                                  │
└───────────────────────────────┼──────────────────────────────────┘
                                │
                ┌───────────────┼───────────────┐
                │               │               │
        ┌───────▼────────┐  ┌───▼────────┐  ┌──▼──────────┐
        │  Gmail SMTP    │  │  Google    │  │  MongoDB    │
        │  - Send emails │  │  OAuth     │  │  (optional) │
        │  - Verify code │  │  - Auth    │  │  - Storage  │
        │  - Reset code  │  │  - Profile │  │             │
        └────────────────┘  └────────────┘  └─────────────┘
```

## Data Flow Diagrams

### Signup Flow

```
User (Frontend)
    │
    ├─→ Fill signup form
    │
    ├─→ POST /api/auth/signup
    │   {name, email, password, role}
    │
    ▼ Backend
    ├─→ Validate input
    ├─→ Check email exists
    ├─→ Create user
    ├─→ Hash password
    ├─→ Generate verification code
    ├─→ Send email
    │
    ▼ Frontend
    ├─→ Show verification modal
    ├─→ User enters code
    │
    ├─→ POST /api/auth/verify-email
    │   {email, code}
    │
    ▼ Backend
    ├─→ Verify code
    ├─→ Mark email as verified
    │
    ▼ Frontend
    ├─→ Show password modal
    ├─→ User sets password
    │
    ├─→ POST /api/auth/signup
    │   {name, email, password, role}
    │
    ▼ Backend
    ├─→ Create account
    ├─→ Return success
    │
    ▼ Frontend
    ├─→ Redirect to login
```

### Login Flow

```
User (Frontend)
    │
    ├─→ Enter email & password
    │
    ├─→ Execute reCAPTCHA
    │   (automatic)
    │
    ├─→ POST /api/auth/login
    │   {email, password, recaptchaToken}
    │
    ▼ Backend
    ├─→ Verify reCAPTCHA
    │   (score > 0.5)
    ├─→ Find user by email
    ├─→ Compare password
    ├─→ Check email verified
    ├─→ Generate JWT token
    ├─→ Return token & user
    │
    ▼ Frontend
    ├─→ Store token in localStorage
    ├─→ Set Authorization header
    ├─→ Redirect to dashboard
```

### Google OAuth Flow

```
User (Frontend)
    │
    ├─→ Click "Sign in with Google"
    │
    ├─→ Redirect to /api/auth/google
    │
    ▼ Backend
    ├─→ Passport Google OAuth
    ├─→ Redirect to Google
    │
    ▼ Google
    ├─→ User login
    ├─→ Grant permissions
    ├─→ Redirect to callback
    │
    ▼ Backend
    ├─→ /api/auth/google/callback
    ├─→ Verify OAuth code
    ├─→ Get user profile
    ├─→ Check if user exists
    ├─→ Create user if new
    ├─→ Generate JWT token
    ├─→ Redirect to frontend
    │
    ▼ Frontend
    ├─→ GoogleCallback component
    ├─→ Parse token & user
    ├─→ Show role selection modal
    ├─→ User selects role
    │
    ├─→ POST /api/auth/google-signup-role
    │   {googleId, name, email, role}
    │
    ▼ Backend
    ├─→ Update user role
    ├─→ Return success
    │
    ▼ Frontend
    ├─→ Store token
    ├─→ Redirect to dashboard
```

### Forgot Password Flow

```
User (Frontend)
    │
    ├─→ Click "Forgot Password"
    │
    ├─→ Enter email
    │
    ├─→ POST /api/auth/forgot-password
    │   {email}
    │
    ▼ Backend
    ├─→ Find user by email
    ├─→ Generate reset code
    ├─→ Save reset token
    ├─→ Send email with code
    │
    ▼ Frontend
    ├─→ Show code input
    ├─→ User enters code
    │
    ├─→ POST /api/auth/verify-reset-code
    │   {email, code}
    │
    ▼ Backend
    ├─→ Verify code
    ├─→ Check expiration
    ├─→ Return success
    │
    ▼ Frontend
    ├─→ Show password input
    ├─→ User enters new password
    │
    ├─→ POST /api/auth/reset-password
    │   {email, code, newPassword}
    │
    ▼ Backend
    ├─→ Verify code again
    ├─→ Hash new password
    ├─→ Update user
    ├─→ Mark code as used
    ├─→ Return success
    │
    ▼ Frontend
    ├─→ Show success message
    ├─→ Redirect to login
```

## Component Hierarchy

```
App
├── AuthWrapper
│   ├── LoginUpdated
│   │   ├── Form inputs
│   │   ├── Forgot Password Modal
│   │   └── Google OAuth button
│   │
│   ├── SignUpUpdated
│   │   ├── Form inputs
│   │   ├── Verification Modal
│   │   ├── Password Modal
│   │   └── Google OAuth button
│   │
│   └── GoogleCallback
│       └── Role Selection Modal
│
├── Dashboard (Protected)
│   ├── Layout
│   ├── Sidebar
│   └── Content
│
└── Other Routes
```

## Database Schema

### Users Collection
```javascript
{
  id: string (UUID),
  name: string,
  email: string (unique),
  password: string (hashed),
  role: 'owner' | 'admin' | 'cashier',
  googleId: string | null,
  isVerified: boolean,
  createdAt: ISO string,
  updatedAt: ISO string
}
```

### PasswordResets Collection
```javascript
{
  id: string (UUID),
  email: string,
  code: string (6 digits),
  expiresAt: Date (15 minutes),
  createdAt: ISO string,
  used: boolean
}
```

### PendingAdmins Collection
```javascript
{
  id: string (UUID),
  name: string,
  email: string,
  password: string (hashed),
  role: 'admin',
  requestedAt: ISO string
}
```

## Security Architecture

```
┌─────────────────────────────────────┐
│      Frontend (React)               │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  reCAPTCHA v3               │   │
│  │  - Bot detection            │   │
│  │  - Score verification       │   │
│  └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
        ┌──────▼──────┐
        │ HTTPS/TLS   │
        │ Encryption  │
        └──────┬──────┘
               │
┌──────────────▼──────────────────────┐
│      Backend (Express)              │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  CORS Protection            │   │
│  │  - Whitelist origins        │   │
│  │  - Credentials              │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  JWT Authentication         │   │
│  │  - Token verification       │   │
│  │  - Expiration check         │   │
│  │  - Signature validation     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Password Security          │   │
│  │  - bcryptjs hashing         │   │
│  │  - Salt rounds: 10          │   │
│  │  - Never store plain text   │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │  Error Handling             │   │
│  │  - No sensitive info leaked │   │
│  │  - Proper HTTP status codes │   │
│  │  - Logging without secrets  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

## Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Production Environment          │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Frontend (Vercel/Netlify)       │  │
│  │  - React app                     │  │
│  │  - Static hosting                │  │
│  │  - CDN distribution              │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Backend (Heroku/Railway/Render) │  │
│  │  - Node.js server                │  │
│  │  - Environment variables         │  │
│  │  - Database connection           │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Database (MongoDB Atlas)        │  │
│  │  - Cloud hosted                  │  │
│  │  - Automated backups             │  │
│  │  - Encryption at rest            │  │
│  └──────────────────────────────────┘  │
│                                         │
│  ┌──────────────────────────────────┐  │
│  │  Email Service (SendGrid/Mailgun)│  │
│  │  - Transactional emails          │  │
│  │  - Delivery tracking             │  │
│  │  - Bounce handling               │  │
│  └──────────────────────────────────┘  │
│                                         │
└─────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 19.2.0
- **Language**: TypeScript 5.8.3
- **Build Tool**: Vite 7.1.6
- **HTTP Client**: Fetch API
- **UI Components**: shadcn/ui, React Bootstrap
- **Icons**: Lucide React, React Icons
- **Notifications**: Sonner
- **Routing**: React Router v7

### Backend
- **Runtime**: Node.js 14+
- **Framework**: Express 4.18.2
- **Authentication**: Passport.js, JWT
- **Password**: bcryptjs
- **Email**: Nodemailer
- **OAuth**: passport-google-oauth20
- **Database**: In-memory (can be replaced with MongoDB)
- **Session**: express-session

### External Services
- **Google OAuth**: Google Cloud Console
- **reCAPTCHA**: Google reCAPTCHA Admin
- **Email**: Gmail SMTP
- **Hosting**: Vercel/Netlify (frontend), Heroku/Railway (backend)

## Scalability Considerations

1. **Database**: Replace in-memory DB with MongoDB
2. **Caching**: Add Redis for token caching
3. **Load Balancing**: Use load balancer for backend
4. **CDN**: Use CDN for static assets
5. **Rate Limiting**: Implement rate limiting middleware
6. **Monitoring**: Add error tracking (Sentry)
7. **Logging**: Centralized logging (ELK stack)
8. **Sessions**: Use distributed session store

## Performance Metrics

- **API Response Time**: < 200ms
- **Frontend Load Time**: < 2s
- **JWT Token Size**: < 1KB
- **Email Delivery**: < 5s
- **reCAPTCHA Score**: 0-1 (threshold: 0.5)
