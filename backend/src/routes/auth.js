import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { User, PasswordReset, PendingAdmin, SystemSettings } from '../database/mongodb.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendAdminApprovalEmail } from '../services/emailService.js';
import { verifyRecaptcha, verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

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

// ============ SIGNUP ============
router.post('/signup', asyncHandler(async (req, res) => {
  const { name, email, password, role } = req.body;

  // Validation
  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  // Gate signups unless owner doesn't exist
  const ownerExists = await User.findOne({ role: 'owner', isArchived: false });
  if (ownerExists) {
    const settings = await SystemSettings.findOne({ id: 'system' });
    if (!settings || !settings.signupsOpen) {
      return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
    }
  }

  // If admin role and already pending approval, block duplicate signup
  if (role === 'admin') {
    const existingPending = await PendingAdmin.findOne({ email });
    if (existingPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  // Check if user exists
  const existingUser = await User.findOne({ email, isArchived: false });
  if (existingUser) {
    const hasGoogleOnly = !!existingUser.googleId && Array.isArray(existingUser.loginMethods) && !existingUser.loginMethods.includes('password');
    if (hasGoogleOnly) {
      return res.status(409).json({ error: 'This email is registered using Google Sign-In. Please use Google to continue.' });
    }
    if (existingUser.password) {
      return res.status(409).json({ error: 'This email already exists. Please log in instead.' });
    }
  }

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 12);

  // Create user
  const user = new User({
    id: uuidv4(),
    name,
    email,
    password: hashedPassword,
    role: role || 'cashier',
    googleId: undefined,
    loginMethods: ['password'],
    passwordCreatedManually: false,
    isVerified: false,
  });

  await user.save();

  // Send verification email
  const code = generateCode();
  const passwordReset = new PasswordReset({
    id: uuidv4(),
    email,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });

  await passwordReset.save();

  try {
    await sendVerificationEmail(email, code);
    console.log('Verification email sent successfully to:', email);
  } catch (err) {
    console.error('Email sending failed:', err);
    return res.status(500).json({ error: 'Failed to send verification email' });
  }

  res.status(201).json({
    message: 'Verification code sent to email.',
  });
}));

// ============ VERIFY EMAIL ============
router.post('/verify-email', asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const reset = await PasswordReset.findOne({ 
    email, 
    code, 
    used: false, 
    expiresAt: { $gt: new Date() } 
  });
  
  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = await User.findOne({ email, isArchived: false });
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  // Verify user but keep code usable for password setup step
  user.isVerified = true;
  await user.save();

  res.json({ message: 'Email verified successfully', user: user.toJSON() });
}));

// ============ LOGIN ============
router.post('/login', verifyRecaptcha, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = await User.findOne({ email, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email.' });
  }

  if (user.isArchived) {
    return res.status(403).json({ error: 'This account has been archived. Please contact an administrator.' });
  }

  // If account was created via Google only (no manual password)
  const googleOnly = !!user.googleId && Array.isArray(user.loginMethods) && !user.loginMethods.includes('password');
  const facebookOnly = !!user.facebookId && Array.isArray(user.loginMethods) && !user.loginMethods.includes('password');
  if (googleOnly) {
    return res.status(400).json({ error: 'You signed up with Google. Please use Google Sign-In.' });
  }
  if (facebookOnly) {
    return res.status(400).json({ error: 'You signed up with Facebook. Please use Facebook Login.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: 'Please verify your email before logging in.' });
  }

  // Handle admin role depending on owner presence
  const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
  if (user.role === 'admin' && !hasOwner) {
    // No owner — promote this admin to owner and clear any pending record
    user.role = 'owner';
    await user.save();
    await PendingAdmin.deleteOne({ email: user.email });
  } else if (hasOwner) {
    // Owner exists — if pending, block login for any role
    const pending = await PendingAdmin.findOne({ email: user.email });
    if (pending) {
      return res.status(403).json({ error: 'Please wait for an owner or admin to approve your account.' });
    }
  }

  const token = generateToken(user);
  // Persist last login audit info (best-effort)
  try {
    const ii = req.ipinfo;
    if (ii) {
      user.lastLogin = {
        ip: ii.ip,
        country: ii.country,
        region: ii.region,
        city: ii.city,
        org: ii.org,
        timezone: ii.timezone,
        at: new Date(),
      };
      await user.save();
    }
  } catch {}

  res.json({
    message: 'Login successful',
    token,
    user: user.toJSON(),
  });
}));

// ============ GOOGLE OAUTH ============
router.get('/google', (req, res, next) => {
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
  return passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'consent select_account', session: false, state })(req, res, next);
});

router.get('/google/callback', (req, res, next) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  // Validate state to prevent unintended logins (e.g., browser back navigation)
  const stateFromQuery = req.query?.state;
  const stateFromCookie = readCookie(req, 'oauth_state');
  if (!stateFromQuery || !stateFromCookie || stateFromCookie !== stateFromQuery) {
    res.clearCookie('oauth_state', cookieOpts);
    return res.redirect(`${FRONTEND}/login?error=invalid_state`);
  }
  res.clearCookie('oauth_state', cookieOpts);
  passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      // If user not found, pass minimal profile data to frontend to complete signup (role selection)
      const profile = info && info.profile ? encodeURIComponent(JSON.stringify(info.profile)) : '';
      return res.redirect(`${FRONTEND}/auth/google-callback?signup=required&user=${profile}`);
    }
    // If no owner exists, promote admin to owner at login time
    try {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (!hasOwner && user.role === 'admin') {
        user.role = 'owner';
        await user.save();
        await PendingAdmin.deleteOne({ email: user.email });
      }
    } catch (e) {
      console.error('Google callback owner promotion error:', e);
    }
    // If owner exists and user is pending approval, block login
    try {
      const hasOwner2 = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner2) {
        const pending = await PendingAdmin.findOne({ email: user.email });
        if (pending) {
          return res.redirect(`${FRONTEND}/auth/google-callback?pending=1`);
        }
      }
    } catch (e) {
      console.error('Google callback pending check error:', e);
    }
    const token = generateToken(user);
    return res.redirect(`${FRONTEND}/auth/google-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user.toJSON()))}`);
  })(req, res, next);
});

// ============ FACEBOOK OAUTH ============
router.get('/facebook', (req, res, next) => {
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
  return passport.authenticate('facebook', { scope: ['email'], session: false, state })(req, res, next);
});

router.get('/facebook/callback', (req, res, next) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  const stateFromQuery = req.query?.state;
  const stateFromCookie = readCookie(req, 'oauth_state');
  if (!stateFromQuery || !stateFromCookie || stateFromCookie !== stateFromQuery) {
    res.clearCookie('oauth_state', cookieOpts);
    return res.redirect(`${FRONTEND}/login?error=invalid_state`);
  }
  res.clearCookie('oauth_state', cookieOpts);
  passport.authenticate('facebook', { session: false }, async (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      const profile = info && info.profile ? encodeURIComponent(JSON.stringify(info.profile)) : '';
      return res.redirect(`${FRONTEND}/auth/facebook-callback?signup=required&user=${profile}`);
    }
    // If no owner exists, promote admin to owner at login time
    try {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (!hasOwner && user.role === 'admin') {
        user.role = 'owner';
        await user.save();
        await PendingAdmin.deleteOne({ email: user.email });
      }
    } catch (e) {
      console.error('Facebook callback owner promotion error:', e);
    }
    // If owner exists and user is pending approval, block login
    try {
      const hasOwner2 = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner2) {
        const pending = await PendingAdmin.findOne({ email: user.email });
        if (pending) {
          return res.redirect(`${FRONTEND}/auth/facebook-callback?pending=1`);
        }
      }
    } catch (e) {
      console.error('Facebook callback pending check error:', e);
    }
    const token = generateToken(user);
    return res.redirect(`${FRONTEND}/auth/facebook-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user.toJSON()))}`);
  })(req, res, next);
});

// ============ GOOGLE SIGNUP WITH ROLE ============
router.post('/google-signup-role', asyncHandler(async (req, res) => {
  const { googleId, name, email, role } = req.body;

  if (!googleId || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // If admin role and already pending approval, block duplicate google signup
  if (role === 'admin') {
    const alreadyPending = await PendingAdmin.findOne({ email });
    if (alreadyPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  // Try to find user by Google ID first
  let user = await User.findOne({ googleId, isArchived: false });

  if (!user) {
    // Attempt merge by email
    const byEmail = await User.findOne({ email, isArchived: false });
    if (byEmail) {
      // If existing manual account
      if (!byEmail.googleId) {
        if (!byEmail.isVerified) {
          return res.status(403).json({ error: 'Please verify your email before linking Google.' });
        }
        byEmail.googleId = googleId;
        if (!Array.isArray(byEmail.loginMethods)) byEmail.loginMethods = [];
        if (!byEmail.loginMethods.includes('google')) byEmail.loginMethods.push('google');
        // Keep existing role unless user is selecting admin and owner approval flow applies
        if (role === 'admin') {
          const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
          if (!hasOwner) {
            byEmail.role = 'owner';
          } else {
            byEmail.role = 'admin';
          }
        }
        await byEmail.save();
        user = byEmail;
      } else {
        // Another Google account with same email (shouldn't happen normally)
        user = byEmail;
      }
    } else {
      // Gate new Google-based signups unless owner doesn't exist
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner) {
        const settings = await SystemSettings.findOne({ id: 'system' });
        if (!settings || !settings.signupsOpen) {
          return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
        }
      }
      // Create new user for Google signup
      user = new User({
        id: uuidv4(),
        name,
        email,
        googleId,
        role,
        isVerified: true,
        loginMethods: ['google'],
        passwordCreatedManually: false,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
      });
      await user.save();
    }
  } else {
    // Update existing user role if needed
    user.role = role;
    await user.save();
  }

  // If admin role, apply owner approval flow
  if (role === 'admin') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (!hasOwner) {
      user.role = 'owner';
      await user.save();
    } else {
      // Create or upsert pending admin request
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name,
        email,
        role: 'admin',
        password: user.password,
        requestedAt: new Date(),
      });
      try {
        await sendAdminApprovalEmail(email, name);
      } catch (err) {
        console.error('Email sending failed:', err);
      }
      // Do not issue a token while pending approval
      return res.json({ message: 'Admin request submitted! Pending owner approval.' });
    }
  } else if (role === 'cashier') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (hasOwner) {
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name,
        email,
        role: 'cashier',
        password: user.password,
        requestedAt: new Date(),
      });
      // Do not issue a token while pending approval
      return res.json({ message: 'Cashier request submitted! Pending owner or admin approval.' });
    }
  }

  const token = generateToken(user);
  return res.json({
    message: 'Google signup successful',
    token,
    user: user.toJSON(),
  });
}));

// ============ FACEBOOK SIGNUP WITH ROLE ============
router.post('/facebook-signup-role', asyncHandler(async (req, res) => {
  const { facebookId, name, email, role } = req.body;

  if (!facebookId || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // If admin role and already pending approval, block duplicate facebook signup
  if (role === 'admin') {
    const alreadyPending = await PendingAdmin.findOne({ email });
    if (alreadyPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  // Try to find user by Facebook ID first
  let user = await User.findOne({ facebookId, isArchived: false });

  if (!user) {
    // Attempt merge by email
    const byEmail = await User.findOne({ email, isArchived: false });
    if (byEmail) {
      // If existing manual account
      if (!byEmail.facebookId) {
        if (!byEmail.isVerified) {
          return res.status(403).json({ error: 'Please verify your email before linking Facebook.' });
        }
        byEmail.facebookId = facebookId;
        if (!Array.isArray(byEmail.loginMethods)) byEmail.loginMethods = [];
        if (!byEmail.loginMethods.includes('facebook')) byEmail.loginMethods.push('facebook');
        // Keep existing role unless user is selecting admin and owner approval flow applies
        if (role === 'admin') {
          const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
          if (!hasOwner) {
            byEmail.role = 'owner';
          } else {
            byEmail.role = 'admin';
          }
        } else if (role === 'cashier') {
          // Optionally update to cashier if desired; otherwise keep existing
          byEmail.role = byEmail.role || 'cashier';
        }
        await byEmail.save();
        user = byEmail;
      } else {
        // Another Facebook account with same email (shouldn't happen normally)
        user = byEmail;
      }
    } else {
      // Gate new Facebook-based signups unless owner doesn't exist
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner) {
        const settings = await SystemSettings.findOne({ id: 'system' });
        if (!settings || !settings.signupsOpen) {
          return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
        }
      }
      // Create new user for Facebook signup
      user = new User({
        id: uuidv4(),
        name,
        email,
        facebookId,
        role,
        isVerified: true,
        loginMethods: ['facebook'],
        passwordCreatedManually: false,
        password: await bcrypt.hash(Math.random().toString(36).slice(-8), 12),
      });
      await user.save();
    }
  } else {
    // Update existing user role if needed
    user.role = role;
    await user.save();
  }

  // If admin role, apply owner approval flow
  if (role === 'admin') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (!hasOwner) {
      user.role = 'owner';
      await user.save();
    } else {
      // Create or upsert pending admin request
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name,
        email,
        role: 'admin',
        password: user.password,
        facebookId,
        requestedAt: new Date(),
      });
      try {
        await sendAdminApprovalEmail(email, name);
      } catch (err) {
        console.error('Email sending failed:', err);
      }
      // Do not issue a token while pending approval
      return res.json({ message: 'Admin request submitted! Pending owner approval.' });
    }
  } else if (role === 'cashier') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (hasOwner) {
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name,
        email,
        role: 'cashier',
        password: user.password,
        facebookId,
        requestedAt: new Date(),
      });
      // Do not issue a token while pending approval
      return res.json({ message: 'Cashier request submitted! Pending owner or admin approval.' });
    }
  }

  const token = generateToken(user);
  return res.json({
    message: 'Facebook signup successful',
    token,
    user: user.toJSON(),
  });
}));

// ============ FORGOT PASSWORD - REQUEST CODE ============
router.post('/forgot-password', asyncHandler(async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const user = await User.findOne({ email, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const code = generateCode();
  const passwordReset = new PasswordReset({
    id: uuidv4(),
    email,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes
  });

  await passwordReset.save();

  try {
    await sendPasswordResetEmail(email, code);
    console.log('Password reset email sent successfully to:', email);
  } catch (err) {
    console.error('Email sending failed:', err);
    return res.status(500).json({ error: 'Failed to send password reset email' });
  }

  res.json({ message: 'Password reset code sent to email' });
}));

// ============ FORGOT PASSWORD - VERIFY CODE ============
router.post('/verify-reset-code', asyncHandler(async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const reset = await PasswordReset.findOne({
    email,
    code,
    used: false,
    expiresAt: { $gt: new Date() }
  });

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  res.json({ message: 'Code verified successfully' });
}));

// ============ FORGOT PASSWORD - RESET PASSWORD ============
router.post('/reset-password', asyncHandler(async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const reset = await PasswordReset.findOne({ 
    email, 
    code, 
    used: false, 
    expiresAt: { $gt: new Date() } 
  });

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = await User.findOne({ email, isArchived: false });
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  user.password = hashed;
  user.passwordCreatedManually = true;
  if (Array.isArray(user.loginMethods) && !user.loginMethods.includes('password')) {
    user.loginMethods.push('password');
  }
  await user.save();

  // If user selected admin and an owner already exists, mark as pending approval or promote first admin to owner
  const hasOwner = await User.findOne({ role: 'owner' });
  if (user.role === 'admin') {
    if (hasOwner) {
      // Upsert PendingAdmin record to ensure owner approval gate
      const hashedForPending = user.password; // already hashed above
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name: user.name,
        email: user.email,
        password: hashedForPending,
        role: 'admin',
        requestedAt: new Date(),
      });
    } else {
      // No owner yet; promote first admin to owner
      user.role = 'owner';
      await user.save();
    }
  } else if (user.role === 'cashier' && hasOwner) {
    const hashedForPending = user.password;
    await upsertPendingAdminRecord({
      id: uuidv4(),
      name: user.name,
      email: user.email,
      password: hashedForPending,
      role: 'cashier',
      requestedAt: new Date(),
    });
  }

  reset.used = true;
  await reset.save();

  return res.json({ message: 'Password reset successfully' });
}));

// ============ GET CURRENT USER ============
router.get('/me', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: user.toJSON() });
}));

// ============ LOGOUT (CLEAR SESSION) ============
router.post('/logout', (req, res) => {
  try {
    if (typeof req.logout === 'function' && req.session) {
      // passport 0.6+ requires callback
      req.logout({ keepSessionInfo: true }, () => {});
    }
    if (req.session) {
      req.session.destroy(() => {});
    }
    res.clearCookie('connect.sid');
  } catch (e) {
    // ignore errors to keep logout idempotent
  }
  return res.json({ message: 'Logged out' });
});

export default router;
