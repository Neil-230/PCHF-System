# PCH Hardware Store - Complete Setup Guide

## Overview

This project consists of:
- **Frontend**: React + TypeScript (Vite) - Located in `pchf/`
- **Backend**: Node.js + Express - Located in `backend/`

## Backend Setup

### 1. Navigate to Backend Directory

```bash
cd backend
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/pch-store

JWT_SECRET=your_super_secret_jwt_key_change_this_in_production
JWT_EXPIRE=7d

# Google OAuth - Get from https://console.cloud.google.com/
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# reCAPTCHA - Get from https://www.google.com/recaptcha/admin
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key

# Email Configuration (Gmail)
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=noreply@pchstore.com

FRONTEND_URL=http://localhost:5173
```

### 4. Start Backend Server

```bash
npm run dev
```

Server will run on `http://localhost:5000`

## Frontend Setup

### 1. Navigate to Frontend Directory

```bash
cd pchf
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Edit `.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=your_recaptcha_site_key
```

### 4. Start Frontend Development Server

```bash
npm run dev
```

Frontend will run on `http://localhost:5173`

## Getting Required Credentials

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable Google+ API
4. Create OAuth 2.0 credentials (Web application)
5. Add authorized redirect URIs:
   - `http://localhost:5000/api/auth/google/callback`
   - `http://localhost:5000/api/auth/google/callback`
6. Copy Client ID and Client Secret

### reCAPTCHA Setup

1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site
3. Choose reCAPTCHA v3
4. Add domains:
   - `localhost`
   - `127.0.0.1`
5. Copy Site Key and Secret Key

### Gmail App Password

1. Enable 2-Factor Authentication on your Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate a new app password for "Mail"
4. Use this password in `EMAIL_PASSWORD` in `.env`

## Features Implemented

### Authentication
- ✅ Manual signup with email verification
- ✅ Google OAuth 2.0 integration
- ✅ Role selection after Google signup
- ✅ Login with reCAPTCHA v3
- ✅ Forgot password with email verification
- ✅ JWT token-based authentication

### Email Notifications
- ✅ Email verification on signup
- ✅ Password reset email
- ✅ Admin approval notification

### Security
- ✅ Password hashing with bcryptjs
- ✅ JWT token authentication
- ✅ reCAPTCHA v3 on login
- ✅ CORS protection
- ✅ Token expiration (7 days)
- ✅ Password reset code expiration (15 minutes)

### User Management
- ✅ Role-based access control (Owner, Admin, Cashier)
- ✅ Admin approval workflow
- ✅ User profile management
- ✅ Pending admin requests

## API Endpoints

### Authentication Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/signup` | Register new user |
| POST | `/api/auth/verify-email` | Verify email with code |
| POST | `/api/auth/login` | Login with reCAPTCHA |
| GET | `/api/auth/google` | Google OAuth login |
| GET | `/api/auth/google/callback` | Google OAuth callback |
| POST | `/api/auth/google-signup-role` | Complete Google signup with role |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/verify-reset-code` | Verify reset code |
| POST | `/api/auth/reset-password` | Reset password |
| GET | `/api/auth/me` | Get current user |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/users` | Get all users |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| GET | `/api/users/admin/pending` | Get pending admin requests |
| POST | `/api/users/admin/approve/:email` | Approve admin |
| POST | `/api/users/admin/decline/:email` | Decline admin |

## Frontend Integration

### Using Updated Components

Replace the old auth components with the updated ones:

1. **Login**: Use `LoginUpdated.tsx` instead of `Login.tsx`
2. **SignUp**: Use `SignUpUpdated.tsx` instead of `SignUp.tsx`

### API Service Usage

```typescript
import apiService from './services/api';

// Signup
await apiService.signup(name, email, password, role);

// Login
await apiService.login(email, password, recaptchaToken);

// Forgot Password
await apiService.forgotPassword(email);
```

### reCAPTCHA Integration

The frontend automatically loads reCAPTCHA v3 and executes it on login.

## Troubleshooting

### Backend Issues

**Port already in use:**
```bash
# Change PORT in .env or kill the process
lsof -i :5000
kill -9 <PID>
```

**Email not sending:**
- Verify Gmail app password is correct
- Enable "Less secure app access" if not using app password
- Check email configuration in `.env`

**Google OAuth not working:**
- Verify redirect URI matches exactly
- Check Client ID and Secret
- Ensure Google+ API is enabled

### Frontend Issues

**API connection refused:**
- Ensure backend is running on port 5000
- Check `VITE_API_URL` in `.env`

**reCAPTCHA not loading:**
- Verify `VITE_RECAPTCHA_SITE_KEY` is correct
- Check browser console for errors

## Production Deployment

### Backend Deployment (Heroku/Railway/Render)

1. Set environment variables in deployment platform
2. Ensure `NODE_ENV=production`
3. Update `FRONTEND_URL` to production URL
4. Update Google OAuth redirect URI
5. Use production email service

### Frontend Deployment (Vercel/Netlify)

1. Set environment variables in deployment platform
2. Update `VITE_API_URL` to production backend URL
3. Update `VITE_RECAPTCHA_SITE_KEY` for production domain
4. Build: `npm run build`
5. Deploy dist folder

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use production email service (SendGrid, Mailgun, etc.)
- [ ] Enable HTTPS in production
- [ ] Set `NODE_ENV=production`
- [ ] Use environment variables for all secrets
- [ ] Enable CORS only for your domain
- [ ] Set secure cookie flags
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Monitor error logs
