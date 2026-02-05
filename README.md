# PCH Hardware Store - Complete System

A full-stack authentication system with Google OAuth, email verification, reCAPTCHA, and role-based access control.

## 🎯 Features Implemented

### Authentication
- ✅ **Manual Signup** - Email verification with OTP codes
- ✅ **Google OAuth 2.0** - One-click Google login
- ✅ **Role Selection** - Choose role after Google signup
- ✅ **Email Verification** - Verify email before account activation
- ✅ **Login with reCAPTCHA** - Bot protection on login
- ✅ **Forgot Password** - Email-based password reset
- ✅ **JWT Tokens** - Secure token-based authentication

### User Management
- ✅ **Role-Based Access** - Owner, Admin, Cashier roles
- ✅ **Admin Approval Workflow** - Owner approves admin requests
- ✅ **User Profiles** - View and update user information
- ✅ **Pending Admin Requests** - Track pending approvals

### Security
- ✅ **Password Hashing** - bcryptjs encryption
- ✅ **reCAPTCHA v3** - Bot detection on login
- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **CORS Protection** - Cross-origin request control
- ✅ **Token Expiration** - 7-day token validity
- ✅ **Code Expiration** - 15-minute reset code validity

### Email Services
- ✅ **Email Verification** - Send verification codes
- ✅ **Password Reset** - Send reset codes
- ✅ **Admin Notifications** - Notify on admin requests

## 📁 Project Structure

```
System/
├── backend/                    # Node.js Express Backend
│   ├── src/
│   │   ├── server.js          # Main server
│   │   ├── routes/            # API routes
│   │   ├── models/            # Data models
│   │   ├── database/          # In-memory DB
│   │   ├── services/          # Business logic
│   │   ├── middleware/        # Auth & error handling
│   │   └── config/            # Passport config
│   ├── .env.example
│   ├── package.json
│   └── README.md
│
├── pchf/                       # React Frontend
│   ├── src/
│   │   ├── components/auth/   # Auth components
│   │   ├── services/          # API & reCAPTCHA
│   │   └── ...
│   ├── .env.example
│   └── package.json
│
├── SETUP_GUIDE.md             # Complete setup
├── INTEGRATION_GUIDE.md       # Integration details
├── QUICK_REFERENCE.md         # Quick commands
└── README.md                  # This file
```

## 🚀 Quick Start

### 1. Backend Setup (2 minutes)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Frontend Setup (2 minutes)

```bash
cd pchf
npm install
cp .env.example .env
# Edit .env with API URL and reCAPTCHA key
npm run dev
```

### 3. Access Application

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:5000`

## 🧪 Demo Accounts (Seed Data)

Use the built-in seeding script to create ready-to-use demo users in your MongoDB cluster:

```bash
cd backend
npm install  # if you haven't yet
node src/scripts/seedUsers.js
```

The script is idempotent—rerunning it simply refreshes the passwords below without creating duplicates. Once it finishes, log in with:

| Role   | Email              | Password         |
|--------|--------------------|------------------|
| Owner  | `owner@pchf.local` | `OwnerPass!123`  |
| Admin  | `admin@pchf.local` | `AdminPass!123`  |
| Cashier| `cashier@pchf.local`| `CashierPass!123` |

> **Tip:** These credentials are for local testing only. Update or delete them before going to production.

## 📋 Required Credentials

### Google OAuth
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create OAuth 2.0 credentials
3. Add redirect URI: `http://localhost:5000/api/auth/google/callback`
4. Copy Client ID and Secret to `.env`

### reCAPTCHA
1. Go to [Google reCAPTCHA Admin](https://www.google.com/recaptcha/admin)
2. Create reCAPTCHA v3 site
3. Add domain: `localhost`
4. Copy Site Key and Secret Key to `.env`

### Gmail App Password
1. Enable 2FA on Google Account
2. Go to [App Passwords](https://myaccount.google.com/apppasswords)
3. Generate app password for Mail
4. Use in `EMAIL_PASSWORD` in `.env`

## 🔑 Key Endpoints

### Authentication
```
POST   /api/auth/signup                    - Register user
POST   /api/auth/verify-email              - Verify email
POST   /api/auth/login                     - Login with reCAPTCHA
GET    /api/auth/google                    - Google OAuth
GET    /api/auth/google/callback           - OAuth callback
POST   /api/auth/google-signup-role        - Complete Google signup
POST   /api/auth/forgot-password           - Request password reset
POST   /api/auth/verify-reset-code         - Verify reset code
POST   /api/auth/reset-password            - Reset password
GET    /api/auth/me                        - Get current user
```

### Users
```
GET    /api/users                          - Get all users
GET    /api/users/:id                      - Get user by ID
PUT    /api/users/:id                      - Update user
GET    /api/users/admin/pending            - Get pending admins
POST   /api/users/admin/approve/:email     - Approve admin
POST   /api/users/admin/decline/:email     - Decline admin
```

## 🔄 Authentication Flows

### Manual Signup
```
1. Fill signup form → 2. Verify email → 3. Set password → 4. Account created
```

### Google OAuth
```
1. Click Google button → 2. Google login → 3. Select role → 4. Account created
```

### Login
```
1. Enter credentials → 2. reCAPTCHA check → 3. Verify password → 4. JWT issued
```

### Forgot Password
```
1. Enter email → 2. Receive code → 3. Verify code → 4. Set new password
```

## 🛠️ Frontend Components

### LoginUpdated.tsx
- Email & password login
- reCAPTCHA v3 integration
- Forgot password modal
- Google OAuth button
- Error handling

### SignUpUpdated.tsx
- Manual signup form
- Email verification
- Password creation
- Role selection
- Google OAuth integration

### GoogleCallback.tsx
- Google OAuth callback handler
- Role selection modal
- Token management

## 📦 API Service

```typescript
import apiService from './services/api';

// Signup
await apiService.signup(name, email, password, role);

// Login
await apiService.login(email, password, recaptchaToken);

// Forgot password
await apiService.forgotPassword(email);

// Reset password
await apiService.resetPassword(email, code, newPassword);

// Get current user
await apiService.getCurrentUser();
```

## 🔐 Security Features

- **Password Hashing**: bcryptjs with salt rounds
- **JWT Tokens**: Secure token-based authentication
- **reCAPTCHA v3**: Bot detection on login
- **CORS**: Cross-origin request control
- **Token Expiration**: 7-day validity
- **Code Expiration**: 15-minute reset codes
- **Email Verification**: Prevent fake accounts

## 📊 User Roles

| Role | Permissions |
|------|-------------|
| **Owner** | Full system access, approve admins |
| **Admin** | User management, system settings |
| **Cashier** | Basic access, security settings |

## ⚙️ Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx
RECAPTCHA_SECRET_KEY=xxx
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=xxx
```

## 🧪 Testing

### Test Signup
1. Go to signup page
2. Fill form and click "Confirm"
3. Check email for verification code
4. Enter code and set password
5. Account created ✓

### Test Login
1. Go to login page
2. Enter credentials
3. reCAPTCHA executes automatically
4. Redirected to dashboard ✓

### Test Google OAuth
1. Click "Sign in with Google"
2. Complete Google login
3. Select role
4. Account created ✓

### Test Forgot Password
1. Click "Forgot Password"
2. Enter email
3. Check email for code
4. Enter code and new password
5. Password reset ✓

## 🚨 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port in use | Change PORT in .env |
| API not connecting | Check VITE_API_URL |
| reCAPTCHA error | Verify site key |
| Email not sending | Check Gmail credentials |
| Google OAuth fails | Verify redirect URI |

See `SETUP_GUIDE.md` for detailed troubleshooting.

## 📚 Documentation

- **SETUP_GUIDE.md** - Complete setup instructions
- **INTEGRATION_GUIDE.md** - Frontend & backend integration
- **QUICK_REFERENCE.md** - Quick commands & endpoints
- **backend/README.md** - Backend documentation

## 🔄 Workflow

### For Developers

1. Clone repository
2. Follow SETUP_GUIDE.md
3. Configure environment variables
4. Start backend: `npm run dev` (backend/)
5. Start frontend: `npm run dev` (pchf/)
6. Test authentication flows
7. Integrate with your app

### For Production

1. Update environment variables
2. Use production database
3. Enable HTTPS
4. Configure email service
5. Update Google OAuth URIs
6. Deploy backend & frontend
7. Monitor logs & errors

## 📈 Performance

- JWT tokens cached in localStorage
- Lazy loading for routes
- Optimized API calls
- GZIP compression enabled
- Minimal bundle size

## 🔒 Security Checklist

- [ ] Change JWT_SECRET
- [ ] Use strong email password
- [ ] Enable HTTPS
- [ ] Set NODE_ENV=production
- [ ] Use environment variables
- [ ] Enable CORS for your domain
- [ ] Implement rate limiting
- [ ] Monitor failed logins
- [ ] Update dependencies
- [ ] Regular security audits

## 📞 Support

For issues or questions:
1. Check SETUP_GUIDE.md
2. Check INTEGRATION_GUIDE.md
3. Check QUICK_REFERENCE.md
4. Review backend/README.md
5. Check component files

## 📄 License

This project is provided as-is for educational and commercial use.

## 🎉 Next Steps

1. ✅ Setup backend and frontend
2. ✅ Configure credentials
3. ✅ Test all flows
4. ✅ Integrate with dashboard
5. ✅ Add user management
6. ✅ Deploy to production

---

**Created**: 2024
**Version**: 1.0.0
**Status**: Production Ready
