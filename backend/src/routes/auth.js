import express from 'express';
import { verifyRecaptcha, verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import {
  signup,
  verifyEmail,
  login,
  startGoogleOAuth,
  handleGoogleCallback,
  startFacebookOAuth,
  handleFacebookCallback,
  googleSignupWithRole,
  facebookSignupWithRole,
  requestPasswordResetCode,
  verifyResetCode,
  resetPassword,
  changePassword,
  getCurrentUser,
  logout,
  timeoutLogout,
} from '../controllers/authController.js';

const router = express.Router();

// Generate random code
const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

// Generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

const upsertPendingAdminRecord = async (updates, conflictMessage = 'Conflict: pending admin record was updated concurrently. Please retry.') => {
  if (!updates?.email) {
    throw new Error('Pending admin email is required');
  }

  let pending = await PendingAdmin.findOne({ email: updates.email });
  const payload = { ...updates };

  if (!pending) {
    payload.id = payload.id || uuidv4();
    payload.requestedAt = payload.requestedAt || new Date();
    pending = new PendingAdmin(payload);
  } else {
    payload.id = payload.id || pending.id || uuidv4();
    payload.requestedAt = payload.requestedAt || new Date();
    pending.set(payload);
  }

  try {
    await pending.save();
  } catch (err) {
    if (err?.name === 'VersionError') {
      throw Object.assign(new Error(conflictMessage), { status: 409 });
    }
    throw err;
  }

  return pending;
};

// Cookie options helper for OAuth state
const cookieOpts = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

const readCookie = (req, name) => {
  const header = req.headers?.cookie || '';
  const parts = header.split(';');
  for (const p of parts) {
    const [k, ...rest] = p.trim().split('=');
    if (k === decodeURIComponent(name)) return decodeURIComponent(rest.join('='));
  }
  return undefined;
};

const buildAccessSnapshot = (ipinfo) => ({
  ip: ipinfo?.ip || ipinfo?.publicIp || ipinfo?.clientIp || null,
  country: ipinfo?.country || null,
  region: ipinfo?.region || null,
  city: ipinfo?.city || null,
  loc: ipinfo?.loc || null,
  org: ipinfo?.org || null,
  timezone: ipinfo?.timezone || null,
});

const recordActivityLog = async (user, type, ipinfo, at) => {
  if (!user) return;
  try {
    await UserActivityLog.create({
      id: uuidv4(),
      userId: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      type,
      ...buildAccessSnapshot(ipinfo),
      at: at || new Date(),
    });
  } catch (err) {
    console.warn(`Failed to record ${type} activity for`, user.email, err?.message || err);
  }
};

const hasPasswordLogin = (user) => {
  if (!user) return false;

  if (Array.isArray(user.loginMethods)) {
    if (user.loginMethods.includes('password')) {
      return true;
    }
    if (user.loginMethods.length > 0) {
      return false;
    }
  }

  if (user.passwordCreatedManually === false) {
    return false;
  }

  return !!user.password;
};

const describeSocialProvider = (user) => {
  if (!user) return 'social';
  if (user.googleId) return 'Google';
  if (user.facebookId) return 'Facebook';
  return 'social';
};

const recordLastLogin = async (user, ipinfo) => {
  if (!user) return;
  try {
    const at = new Date();
    user.lastLogin = {
      ...buildAccessSnapshot(ipinfo),
      at,
    };
    await user.save();
    await recordActivityLog(user, 'login', ipinfo, at);
  } catch (err) {
    console.warn('Failed to record last login for', user.email, err?.message || err);
  }
};

const recordLastLogout = async (user, ipinfo) => {
  if (!user) return;
  try {
    const at = new Date();
    user.lastLogout = {
      ...buildAccessSnapshot(ipinfo),
      at,
    };
    await user.save();
    await recordActivityLog(user, 'logout', ipinfo, at);
  } catch (err) {
    console.warn('Failed to record last logout for', user.email, err?.message || err);
  }
};

const logAuthEvent = (type, details = {}) => {
  try {
    console.info('[auth]', JSON.stringify({
      event: type,
      timestamp: new Date().toISOString(),
      ...details,
    }));
  } catch (err) {
    console.info('[auth]', type, details);
  }
};

const sendVerificationCodeWithRetry = async (email, code, attempts = 2) => {
  let lastError;
  for (let i = 1; i <= Math.max(1, attempts); i += 1) {
    try {
      await sendVerificationEmail(email, code);
      logAuthEvent('verification_email_sent', { email, attempt: i });
      return;
    } catch (err) {
      lastError = err;
      logAuthEvent('verification_email_failure', { email, attempt: i, error: err?.message || String(err) });
    }
  }
  throw lastError || new Error('Failed to send verification email');
};

router.post('/signup', asyncHandler(signup));

router.post('/verify-email', asyncHandler(verifyEmail));

router.post('/login', verifyRecaptcha, asyncHandler(login));

// ============ GOOGLE OAUTH ============
router.get('/google', startGoogleOAuth);

router.get('/google/callback', handleGoogleCallback);

// ============ FACEBOOK OAUTH ============
router.get('/facebook', startFacebookOAuth);

router.get('/facebook/callback', handleFacebookCallback);

// ============ GOOGLE SIGNUP WITH ROLE ============
router.post('/google-signup-role', asyncHandler(googleSignupWithRole));

router.post('/facebook-signup-role', asyncHandler(facebookSignupWithRole));

// ============ FORGOT PASSWORD - REQUEST CODE ============
router.post('/forgot-password', asyncHandler(requestPasswordResetCode));

router.post('/verify-reset-code', asyncHandler(verifyResetCode));

router.post('/reset-password', asyncHandler(resetPassword));

router.post('/change-password', verifyToken, asyncHandler(changePassword));

router.get('/me', verifyToken, asyncHandler(getCurrentUser));

router.post('/logout', verifyToken, asyncHandler(logout));

router.post('/timeout-logout', verifyToken, asyncHandler(timeoutLogout));

export default router;
