# Quick Reference Guide

## File Structure

```
System/
├── backend/                          # Node.js Express Backend
│   ├── src/
│   │   ├── server.js                # Main server file
│   │   ├── routes/
│   │   │   ├── auth.js              # Authentication routes
│   │   │   └── users.js             # User management routes
│   │   ├── models/
│   │   │   ├── User.js              # User model
│   │   │   └── PasswordReset.js     # Password reset model
│   │   ├── database/
│   │   │   └── db.js                # In-memory database
│   │   ├── services/
│   │   │   └── emailService.js      # Email sending service
│   │   ├── middleware/
│   │   │   ├── auth.js              # JWT & reCAPTCHA middleware
│   │   │   └── errorHandler.js      # Error handling
│   │   └── config/
│   │       └── passport.js          # Google OAuth config
│   ├── .env.example                 # Environment variables template
│   ├── package.json
│   └── README.md
│
├── pchf/                            # React Frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── auth/
│   │   │   │   ├── LoginUpdated.tsx        # Updated login with backend
│   │   │   │   ├── SignUpUpdated.tsx       # Updated signup with backend
│   │   │   │   └── GoogleCallback.tsx      # Google OAuth callback
│   │   │   └── ...
│   │   ├── services/
│   │   │   ├── api.ts               # API service
│   │   │   └── recaptcha.ts         # reCAPTCHA service
│   │   └── ...
│   ├── .env.example
│   └── package.json
│
├── SETUP_GUIDE.md                   # Complete setup instructions
├── INTEGRATION_GUIDE.md             # Integration details
└── QUICK_REFERENCE.md              # This file
```

## Quick Commands

### Backend

```bash
# Install dependencies
cd backend && npm install

# Start development server
npm run dev

# Start production server
npm start
```

### Frontend

```bash
# Install dependencies
cd pchf && npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Environment Setup

### Backend .env

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key_here
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
RECAPTCHA_SECRET_KEY=xxx
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
```

### Frontend .env

```env
VITE_API_URL=http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=xxx
```

## API Endpoints Summary

### Auth Routes

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/api/auth/signup` | POST | `{name, email, password, role}` | `{message, user}` |
| `/api/auth/verify-email` | POST | `{email, code}` | `{message, user}` |
| `/api/auth/login` | POST | `{email, password, recaptchaToken}` | `{message, token, user}` |
| `/api/auth/forgot-password` | POST | `{email}` | `{message}` |
| `/api/auth/verify-reset-code` | POST | `{email, code}` | `{message}` |
| `/api/auth/reset-password` | POST | `{email, code, newPassword}` | `{message}` |
| `/api/auth/google` | GET | - | Redirects to Google |
| `/api/auth/google/callback` | GET | - | Redirects to frontend |
| `/api/auth/google-signup-role` | POST | `{googleId, name, email, role}` | `{message, token, user}` |
| `/api/auth/me` | GET | - | `{user}` |

### User Routes

| Endpoint | Method | Body | Returns |
|----------|--------|------|---------|
| `/api/users` | GET | - | `{users}` |
| `/api/users/:id` | GET | - | `{user}` |
| `/api/users/:id` | PUT | `{updates}` | `{message, user}` |
| `/api/users/admin/pending` | GET | - | `{pending}` |
| `/api/users/admin/approve/:email` | POST | - | `{message, user}` |
| `/api/users/admin/decline/:email` | POST | - | `{message}` |

## Frontend Components

### LoginUpdated.tsx

Features:
- Email & password login
- reCAPTCHA v3 integration
- Forgot password modal
- Google OAuth button
- Error handling
- Loading states

Usage:
```typescript
<LoginUpdated 
  onLogin={handleLogin} 
  onSwitchToSignUp={handleSwitchToSignUp} 
/>
```

### SignUpUpdated.tsx

Features:
- Manual signup form
- Email verification
- Password creation
- Role selection
- Google OAuth integration
- Error handling

Usage:
```typescript
<SignUpUpdated 
  onSignUp={handleSignUp} 
  onSwitchToLogin={handleSwitchToLogin} 
/>
```

### GoogleCallback.tsx

Features:
- Handles Google OAuth callback
- Role selection modal
- Token management
- Error handling

Usage:
```typescript
<Route path="/auth/google-callback" element={<GoogleCallback />} />
```

## API Service Usage

```typescript
import apiService from './services/api';

// Signup
const result = await apiService.signup(name, email, password, role);

// Login
const result = await apiService.login(email, password, recaptchaToken);

// Verify email
const result = await apiService.verifyEmail(email, code);

// Forgot password
const result = await apiService.forgotPassword(email);

// Reset password
const result = await apiService.resetPassword(email, code, newPassword);

// Get current user
const result = await apiService.getCurrentUser();

// Token management
apiService.setToken(token);
apiService.getToken();
apiService.clearToken();
```

## reCAPTCHA Service Usage

```typescript
import { loadRecaptcha, executeRecaptcha } from './services/recaptcha';

// Load reCAPTCHA script
await loadRecaptcha();

// Execute reCAPTCHA
const token = await executeRecaptcha('login');
```

## Authentication Flow Diagram

```
┌─────────────┐
│   Signup    │
└──────┬──────┘
       │
       ├─→ Email Verification
       │   └─→ Verify Code
       │       └─→ Set Password
       │           └─→ Account Created
       │
       └─→ Google OAuth
           └─→ Role Selection
               └─→ Account Created
                   
┌─────────────┐
│    Login    │
└──────┬──────┘
       │
       ├─→ reCAPTCHA Check
       │   └─→ Verify Credentials
       │       └─→ JWT Token Issued
       │           └─→ Logged In
       │
       └─→ Forgot Password
           └─→ Send Reset Code
               └─→ Verify Code
                   └─→ Reset Password
                       └─→ Password Updated
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5000 in use | Change PORT in .env or kill process |
| API not connecting | Check VITE_API_URL and backend running |
| reCAPTCHA error | Verify VITE_RECAPTCHA_SITE_KEY |
| Email not sending | Check EMAIL_USER and EMAIL_PASSWORD |
| Google OAuth fails | Verify redirect URI and credentials |
| Token expired | User needs to login again |
| CORS error | Check FRONTEND_URL in backend .env |

## Security Checklist

- [ ] Change JWT_SECRET in production
- [ ] Use strong EMAIL_PASSWORD (app password)
- [ ] Enable HTTPS in production
- [ ] Set NODE_ENV=production
- [ ] Use environment variables for secrets
- [ ] Enable CORS only for your domain
- [ ] Implement rate limiting
- [ ] Monitor failed login attempts
- [ ] Keep dependencies updated
- [ ] Regular security audits

## Performance Tips

1. Cache user data after login
2. Use lazy loading for routes
3. Minimize API calls
4. Compress images
5. Enable GZIP compression
6. Use CDN for static files
7. Implement request debouncing
8. Optimize bundle size

## Deployment Checklist

### Backend
- [ ] Set all environment variables
- [ ] Use production database
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure email service
- [ ] Update FRONTEND_URL
- [ ] Update Google OAuth redirect URI
- [ ] Enable rate limiting
- [ ] Setup error logging
- [ ] Configure backups

### Frontend
- [ ] Build production bundle
- [ ] Update VITE_API_URL
- [ ] Update VITE_RECAPTCHA_SITE_KEY
- [ ] Enable compression
- [ ] Setup CDN
- [ ] Configure error tracking
- [ ] Setup analytics
- [ ] Test all flows
- [ ] Performance optimization
- [ ] Security headers

## Support & Resources

- Backend: `backend/README.md`
- Setup: `SETUP_GUIDE.md`
- Integration: `INTEGRATION_GUIDE.md`
- API Docs: Check backend routes
- Frontend: Check component files

## Version Info

- Node.js: 14+
- React: 19.2.0
- Express: 4.18.2
- TypeScript: 5.8.3
- Vite: 7.1.6
