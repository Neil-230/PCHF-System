# Frontend & Backend Integration Guide

## Quick Start

### 1. Backend Setup (5 minutes)

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your credentials
npm run dev
```

### 2. Frontend Setup (5 minutes)

```bash
cd pchf
npm install
cp .env.example .env
# Edit .env with API URL and reCAPTCHA key
npm run dev
```

## Component Integration

### Step 1: Update App.tsx

Add the new authentication components to your main App.tsx:

```typescript
import { LoginUpdated } from './components/auth/LoginUpdated';
import { SignUpUpdated } from './components/auth/SignUpUpdated';
import { GoogleCallback } from './components/auth/GoogleCallback';
```

### Step 2: Add Routes

Add these routes to your router configuration:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

<Routes>
  <Route path="/login" element={<LoginUpdated onLogin={handleLogin} onSwitchToSignUp={() => navigate('/signup')} />} />
  <Route path="/signup" element={<SignUpUpdated onSignUp={handleSignUp} onSwitchToLogin={() => navigate('/login')} />} />
  <Route path="/auth/google-callback" element={<GoogleCallback />} />
  {/* Other routes */}
</Routes>
```

### Step 3: Initialize reCAPTCHA

Add this to your main.tsx or App.tsx:

```typescript
import { loadRecaptcha } from './services/recaptcha';

useEffect(() => {
  loadRecaptcha();
}, []);
```

### Step 4: Add reCAPTCHA Script to index.html

```html
<script src="https://www.google.com/recaptcha/api.js"></script>
```

## Authentication Flow

### Manual Signup Flow

```
1. User fills signup form (name, email, role)
2. Frontend calls apiService.signup()
3. Backend sends verification email
4. User enters code from email
5. Frontend calls apiService.verifyEmail()
6. User sets password
7. Frontend calls apiService.signup() again with password
8. Account created, user redirected to login
```

### Google OAuth Flow

```
1. User clicks "Sign in with Google"
2. Frontend redirects to /api/auth/google
3. Google OAuth flow completes
4. Backend redirects to frontend with token and user data
5. GoogleCallback component shows role selection modal
6. User selects role
7. Frontend calls apiService.googleSignupWithRole()
8. Account setup complete, user redirected to dashboard
```

### Login Flow

```
1. User enters email and password
2. Frontend executes reCAPTCHA
3. Frontend calls apiService.login() with reCAPTCHA token
4. Backend verifies reCAPTCHA score (must be > 0.5)
5. Backend verifies credentials
6. Backend returns JWT token
7. Frontend stores token in localStorage
8. User redirected to dashboard
```

### Forgot Password Flow

```
1. User clicks "Forgot Password"
2. User enters email
3. Frontend calls apiService.forgotPassword()
4. Backend sends reset code to email
5. User enters code
6. Frontend calls apiService.verifyResetCode()
7. User enters new password
8. Frontend calls apiService.resetPassword()
9. Password updated, user redirected to login
```

## API Integration Details

### Authentication Service

The `apiService` handles all API calls:

```typescript
// Signup
await apiService.signup(name, email, password, role);

// Verify email
await apiService.verifyEmail(email, code);

// Login
await apiService.login(email, password, recaptchaToken);

// Google signup with role
await apiService.googleSignupWithRole(googleId, name, email, role);

// Forgot password
await apiService.forgotPassword(email);

// Verify reset code
await apiService.verifyResetCode(email, code);

// Reset password
await apiService.resetPassword(email, code, newPassword);

// Get current user
await apiService.getCurrentUser();

// Token management
apiService.setToken(token);
apiService.getToken();
apiService.clearToken();
```

### Error Handling

All API calls throw errors that should be caught:

```typescript
try {
  await apiService.login(email, password, recaptchaToken);
} catch (err: any) {
  toast.error(err.message); // "Invalid email or password"
}
```

### Token Management

Tokens are automatically stored in localStorage:

```typescript
// After login
apiService.setToken(response.token);

// Token is automatically included in all requests
// Authorization: Bearer <token>

// On logout
apiService.clearToken();
```

## Protected Routes

Wrap routes that require authentication:

```typescript
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const token = apiService.getToken();
  
  if (!token) {
    return <Navigate to="/login" />;
  }
  
  return children;
}

// Usage
<Route 
  path="/dashboard" 
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  } 
/>
```

## User Management

### Get Current User

```typescript
const response = await apiService.getCurrentUser();
const user = response.user;
```

### Get All Users (Admin only)

```typescript
const response = await apiService.getAllUsers();
const users = response.users;
```

### Update User

```typescript
await apiService.updateUser(userId, {
  name: 'New Name',
  role: 'admin'
});
```

### Admin Approval Workflow

```typescript
// Get pending admin requests (Owner only)
const response = await apiService.getPendingAdmins();
const pending = response.pending;

// Approve admin
await apiService.approveAdmin(email);

// Decline admin
await apiService.declineAdmin(email);
```

## Environment Variables

### Backend (.env)

```env
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret_key
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
RECAPTCHA_SECRET_KEY=your_secret_key
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password
FRONTEND_URL=http://localhost:5173
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:5000/api
VITE_RECAPTCHA_SITE_KEY=your_site_key
```

## Testing

### Test Signup Flow

1. Go to signup page
2. Fill in details (name, email, role)
3. Click "Confirm"
4. Check email for verification code
5. Enter code
6. Set password
7. Click "Create Account"
8. Should redirect to login

### Test Login Flow

1. Go to login page
2. Enter credentials
3. reCAPTCHA should execute automatically
4. Should redirect to dashboard

### Test Google OAuth

1. Click "Sign in with Google"
2. Complete Google login
3. Should show role selection modal
4. Select role and continue
5. Should redirect to dashboard

### Test Forgot Password

1. Click "Forgot Password"
2. Enter email
3. Check email for reset code
4. Enter code
5. Set new password
6. Should show success message
7. Login with new password

## Troubleshooting

### "reCAPTCHA not loaded"

- Ensure reCAPTCHA script is in index.html
- Check `VITE_RECAPTCHA_SITE_KEY` is correct
- Check browser console for errors

### "API request failed"

- Ensure backend is running on port 5000
- Check `VITE_API_URL` matches backend URL
- Check CORS is enabled in backend

### "Invalid token"

- Token may have expired (7 days)
- User needs to login again
- Clear localStorage and retry

### "Email not sending"

- Check Gmail app password is correct
- Verify email configuration in backend .env
- Check spam folder

### "Google OAuth redirect error"

- Verify redirect URI in Google Cloud Console
- Ensure it matches exactly: `http://localhost:5000/api/auth/google/callback`
- Check Client ID and Secret

## Security Best Practices

1. **Never commit .env files** - Use .env.example
2. **Use HTTPS in production** - Not just HTTP
3. **Rotate JWT_SECRET regularly** - Change in production
4. **Use strong passwords** - Enforce in backend validation
5. **Enable rate limiting** - Prevent brute force attacks
6. **Monitor logs** - Track failed login attempts
7. **Keep dependencies updated** - Run `npm audit`
8. **Use environment variables** - Never hardcode secrets

## Performance Optimization

1. **Token caching** - Store in localStorage
2. **Lazy load components** - Use React.lazy()
3. **Minimize API calls** - Cache user data
4. **Optimize images** - Use WebP format
5. **Enable compression** - GZIP in backend

## Next Steps

1. ✅ Setup backend and frontend
2. ✅ Configure environment variables
3. ✅ Test authentication flows
4. ✅ Integrate with dashboard
5. ✅ Add user management features
6. ✅ Deploy to production
