# PCH Hardware Store Backend

Backend API for PCH Hardware Store with authentication, Google OAuth, reCAPTCHA, and email verification.

## Features

- User authentication (signup, login, logout)
- Google OAuth 2.0 integration
- Email verification
- Password reset with email
- reCAPTCHA v3 integration
- Role-based access control (Owner, Admin, Cashier)
- Admin approval workflow

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

**Required configurations:**

- **Google OAuth**: Get credentials from [Google Cloud Console](https://console.cloud.google.com/)
- **reCAPTCHA**: Get keys from [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
- **Email Service**: Use Gmail with [App Password](https://support.google.com/accounts/answer/185833)

### 3. Run Development Server

```bash
npm run dev
```

Server runs on `http://localhost:5000`

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Register new user
- `POST /api/auth/verify-email` - Verify email with code
- `POST /api/auth/login` - Login with email and password
- `GET /api/auth/google` - Google OAuth login
- `GET /api/auth/google/callback` - Google OAuth callback
- `POST /api/auth/google-signup-role` - Complete Google signup with role selection
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/verify-reset-code` - Verify reset code
- `POST /api/auth/reset-password` - Reset password
- `GET /api/auth/me` - Get current user

### Users

- `GET /api/users` - Get all users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user
- `GET /api/users/admin/pending` - Get pending admin requests
- `POST /api/users/admin/approve/:email` - Approve admin request
- `POST /api/users/admin/decline/:email` - Decline admin request

## Request Examples

### Signup
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "cashier"
}
```

### Login
```json
{
  "email": "john@example.com",
  "password": "password123",
  "recaptchaToken": "token_from_frontend"
}
```

### Forgot Password
```json
{
  "email": "john@example.com"
}
```

### Reset Password
```json
{
  "email": "john@example.com",
  "code": "123456",
  "newPassword": "newpassword123"
}
```

## Frontend Integration

The frontend should:

1. Include reCAPTCHA v3 script
2. Send reCAPTCHA token with login request
3. Handle Google OAuth redirect
4. Store JWT token in localStorage
5. Include token in Authorization header for protected routes

## Security Notes

- Passwords are hashed with bcryptjs
- JWT tokens expire after 7 days
- Password reset codes expire after 15 minutes
- reCAPTCHA score threshold is 0.5
- CORS is configured for frontend URL
- Sensitive data is never logged
