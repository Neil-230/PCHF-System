import jwt from 'jsonwebtoken';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { User, PasswordReset, PendingAdmin, SystemSettings, UserActivityLog } from '../database/mongodb.js';
import { sendVerificationEmail, sendPasswordResetEmail, sendAdminApprovalEmail } from '../services/emailService.js';
import { emailHashFilter } from '../utils/emailLookup.js';

const generateCode = () => Math.floor(100000 + Math.random() * 900000).toString();

const generateToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRE || '7d' },
);

const findUserByEmail = (email, extra = {}) => User.findOne(emailHashFilter(email, extra));
const deleteUserByEmail = (email, extra = {}) => User.deleteOne(emailHashFilter(email, extra));
const findPendingAdminByEmail = (email, extra = {}) => PendingAdmin.findOne(emailHashFilter(email, extra));
const deletePendingAdminByEmail = (email, extra = {}) => PendingAdmin.deleteOne(emailHashFilter(email, extra));
const findPasswordResetByEmail = (email, extra = {}) => PasswordReset.findOne(emailHashFilter(email, extra));
const deletePasswordResetsByEmail = (email, extra = {}) => PasswordReset.deleteMany(emailHashFilter(email, extra));

const upsertPendingAdminRecord = async (updates, conflictMessage = 'Conflict: pending admin record was updated concurrently. Please retry.') => {
  if (!updates?.email) {
    throw new Error('Pending admin email is required');
  }

  let pending = await findPendingAdminByEmail(updates.email);
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

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const signup = async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required.' });
  }

  // Sanitize and validate inputs
  const sanitizedName = String(name).trim();
  const sanitizedEmail = String(email).trim().toLowerCase();
  const sanitizedRole = String(role).trim();

  if (!sanitizedName) {
    return res.status(400).json({ error: 'Name cannot be empty' });
  }

  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const ownerExists = await User.findOne({ role: 'owner', isArchived: false });
  if (ownerExists) {
    const settings = await SystemSettings.findOne({ id: 'system' });
    if (!settings || !settings.signupsOpen) {
      return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
    }
  }

  if (sanitizedRole === 'admin') {
    const existingPending = await findPendingAdminByEmail(sanitizedEmail);
    if (existingPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  const existingUser = await findUserByEmail(sanitizedEmail, { isArchived: false });
  const hasGoogleOnly = !!existingUser?.googleId && Array.isArray(existingUser.loginMethods) && !existingUser.loginMethods.includes('password');
  if (hasGoogleOnly) {
    logAuthEvent('signup_blocked_google_only', { email: sanitizedEmail });
    return res.status(409).json({ error: 'This email is registered using Google Sign-In. Please use Google to continue.' });
  }

  const hashedPassword = await bcrypt.hash(password, 12);

  let user;
  let reusedUnverifiedAccount = false;
  if (existingUser) {
    if (existingUser.isVerified) {
      logAuthEvent('signup_blocked_existing_verified', { email: sanitizedEmail });
      return res.status(409).json({ error: 'This email already exists. Please log in instead.' });
    }

    existingUser.name = sanitizedName;
    existingUser.password = hashedPassword;
    existingUser.role = sanitizedRole || existingUser.role || 'cashier';
    existingUser.passwordCreatedManually = false;
    if (!Array.isArray(existingUser.loginMethods)) {
      existingUser.loginMethods = [];
    }
    if (!existingUser.loginMethods.includes('password')) {
      existingUser.loginMethods.push('password');
    }
    await existingUser.save();
    user = existingUser;
    reusedUnverifiedAccount = true;
    logAuthEvent('signup_reuse_unverified', { email: sanitizedEmail, role: user.role });
  } else {
    user = new User({
      id: uuidv4(),
      name: sanitizedName,
      email: sanitizedEmail,
      password: hashedPassword,
      role: sanitizedRole || 'cashier',
      googleId: undefined,
      loginMethods: ['password'],
      passwordCreatedManually: false,
      isVerified: false,
    });
    await user.save();
    logAuthEvent('signup_created_pending_verification', { email, role: user.role });
  }

  await deletePasswordResetsByEmail(sanitizedEmail);
  const code = generateCode();
  const passwordReset = new PasswordReset({
    id: uuidv4(),
    email: sanitizedEmail,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });
  await passwordReset.save();

  try {
    await sendVerificationCodeWithRetry(sanitizedEmail, code, 3);
  } catch (err) {
    console.error('Email sending failed:', err);
    await deletePasswordResetsByEmail(sanitizedEmail, { code });
    if (!reusedUnverifiedAccount) {
      await deleteUserByEmail(sanitizedEmail);
    }
    logAuthEvent('signup_failed_verification_delivery', { email: sanitizedEmail, error: err?.message || String(err) });
    return res.status(500).json({ error: 'Failed to send verification email' });
  }

  res.status(201).json({ message: 'Verification code sent to email.' });
};

export const verifyEmail = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const reset = await findPasswordResetByEmail(sanitizedEmail, {
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = await findUserByEmail(sanitizedEmail, { isArchived: false });
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  user.isVerified = true;
  await user.save();

  // Note: Do NOT mark as used here - will be marked as used in resetPassword
  // This allows the code to be used for setting the password after verification

  res.json({ message: 'Email verified successfully', user: user.toJSON() });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const user = await findUserByEmail(sanitizedEmail, { isArchived: false });
  if (!user) {
    logAuthEvent('login_failed_no_account', { email: sanitizedEmail });
    return res.status(404).json({ error: 'No account found with this email.' });
  }

  if (user.isArchived) {
    return res.status(403).json({ error: 'This account has been archived. Please contact an administrator.' });
  }

  const googleOnly = !!user.googleId && Array.isArray(user.loginMethods) && !user.loginMethods.includes('password');
  const facebookOnly = !!user.facebookId && Array.isArray(user.loginMethods) && !user.loginMethods.includes('password');
  if (googleOnly) {
    logAuthEvent('login_blocked_google_only', { email });
    return res.status(400).json({ error: 'You signed up with Google. Please use Google Sign-In.' });
  }
  if (facebookOnly) {
    logAuthEvent('login_blocked_facebook_only', { email });
    return res.status(400).json({ error: 'You signed up with Facebook. Please use Facebook Login.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logAuthEvent('login_failed_bad_password', { email });
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  if (!user.isVerified) {
    logAuthEvent('login_blocked_unverified', { email });
    return res.status(403).json({ error: 'Please verify your email before logging in.' });
  }

  const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
  if (user.role === 'admin' && !hasOwner) {
    user.role = 'owner';
    await user.save();
    await deletePendingAdminByEmail(user.email);
  } else if (hasOwner) {
    const pending = await findPendingAdminByEmail(user.email);
    if (pending) {
      logAuthEvent('login_blocked_pending_approval', { email });
      return res.status(403).json({ error: 'Please wait for an owner or admin to approve your account.' });
    }
  }

  const token = generateToken(user);
  await recordLastLogin(user, req.ipinfo);

  logAuthEvent('login_success', { email, role: user.role });
  res.json({ message: 'Login successful', token, user: user.toJSON() });
};

export const startGoogleOAuth = (req, res, next) => {
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
  return passport.authenticate('google', { scope: ['profile', 'email'], prompt: 'consent select_account', session: false, state })(req, res, next);
};

export const handleGoogleCallback = (req, res, next) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  const stateFromQuery = req.query?.state;
  const stateFromCookie = readCookie(req, 'oauth_state');
  if (!stateFromQuery || !stateFromCookie || stateFromCookie !== stateFromQuery) {
    res.clearCookie('oauth_state', cookieOpts);
    return res.redirect(`${FRONTEND}/login?error=invalid_state`);
  }
  res.clearCookie('oauth_state', cookieOpts);
  return passport.authenticate('google', { session: false }, async (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      const profile = info && info.profile ? JSON.stringify(info.profile) : '';
      // Store profile in secure session instead of URL param
      if (profile) {
        res.cookie('oauth_profile', profile, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
      }
      return res.redirect(`${FRONTEND}/auth/google-callback?signup=required`);
    }
    try {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (!hasOwner && user.role === 'admin') {
        user.role = 'owner';
        await user.save();
        await deletePendingAdminByEmail(user.email);
      }
    } catch (e) {
      console.error('Google callback owner promotion error:', e);
      return res.redirect(`${FRONTEND}/auth/google-callback?error=role_assignment_failed`);
    }
    try {
      const hasOwner2 = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner2) {
        const pending = await findPendingAdminByEmail(user.email);
        if (pending) {
          return res.redirect(`${FRONTEND}/auth/google-callback?pending=1`);
        }
      }
    } catch (e) {
      console.error('Google callback pending check error:', e);
      return res.redirect(`${FRONTEND}/auth/google-callback?error=pending_check_failed`);
    }
    await recordLastLogin(user, req.ipinfo || {});
    const token = generateToken(user);
    // Store token in secure httpOnly cookie instead of URL parameter
    res.cookie('authToken', token, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
    // Store user data in secure cookie too (less sensitive than token)
    res.cookie('userData', JSON.stringify(user.toJSON()), { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.redirect(`${FRONTEND}/auth/google-callback?token_set=true`);
  })(req, res, next);
};

export const startFacebookOAuth = (req, res, next) => {
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie('oauth_state', state, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
  return passport.authenticate('facebook', { scope: ['email'], session: false, state })(req, res, next);
};

export const handleFacebookCallback = (req, res, next) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  const stateFromQuery = req.query?.state;
  const stateFromCookie = readCookie(req, 'oauth_state');
  if (!stateFromQuery || !stateFromCookie || stateFromCookie !== stateFromQuery) {
    res.clearCookie('oauth_state', cookieOpts);
    return res.redirect(`${FRONTEND}/login?error=invalid_state`);
  }
  res.clearCookie('oauth_state', cookieOpts);
  return passport.authenticate('facebook', { session: false }, async (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      const profile = info && info.profile ? JSON.stringify(info.profile) : '';
      // Store profile in secure session instead of URL param
      if (profile) {
        res.cookie('oauth_profile', profile, { ...cookieOpts, maxAge: 10 * 60 * 1000 });
      }
      return res.redirect(`${FRONTEND}/auth/facebook-callback?signup=required`);
    }
    try {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (!hasOwner && user.role === 'admin') {
        user.role = 'owner';
        await user.save();
        await deletePendingAdminByEmail(user.email);
      }
    } catch (e) {
      console.error('Facebook callback owner promotion error:', e);
      return res.redirect(`${FRONTEND}/auth/facebook-callback?error=role_assignment_failed`);
    }
    try {
      const hasOwner2 = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner2) {
        const pending = await findPendingAdminByEmail(user.email);
        if (pending) {
          return res.redirect(`${FRONTEND}/auth/facebook-callback?pending=1`);
        }
      }
    } catch (e) {
      console.error('Facebook callback pending check error:', e);
      return res.redirect(`${FRONTEND}/auth/facebook-callback?error=pending_check_failed`);
    }
    await recordLastLogin(user, req.ipinfo || {});
    const token = generateToken(user);
    // Store token in secure httpOnly cookie instead of URL parameter
    res.cookie('authToken', token, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
    // Store user data in secure cookie too (less sensitive than token)
    res.cookie('userData', JSON.stringify(user.toJSON()), { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });
    return res.redirect(`${FRONTEND}/auth/facebook-callback?token_set=true`);
  })(req, res, next);
};

export const googleSignupWithRole = async (req, res) => {
  const { googleId, name, email, role } = req.body;

  if (!googleId || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (role === 'admin') {
    const alreadyPending = await findPendingAdminByEmail(email);
    if (alreadyPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  let user = await User.findOne({ googleId, isArchived: false });

  if (!user) {
    const byEmail = await findUserByEmail(email, { isArchived: false });
    if (byEmail) {
      const hasManual = hasPasswordLogin(byEmail);
      if (!byEmail.isVerified) {
        logAuthEvent('google_signup_blocked_unverified_manual', { email });
        return res.status(403).json({ error: 'Please verify your email before linking Google.' });
      }
      if (hasManual) {
        logAuthEvent('google_signup_blocked_manual_only', { email });
        return res.status(409).json({ error: 'This email already has an email/password login. Please continue signing in manually.' });
      }

      byEmail.googleId = googleId;
      if (!Array.isArray(byEmail.loginMethods)) byEmail.loginMethods = [];
      if (!byEmail.loginMethods.includes('google')) byEmail.loginMethods.push('google');
      user = byEmail;
      await user.save();
    } else {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner) {
        const settings = await SystemSettings.findOne({ id: 'system' });
        if (!settings || !settings.signupsOpen) {
          return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
        }
      }
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
    user.role = role;
    await user.save();
  }

  if (role === 'admin') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (!hasOwner) {
      user.role = 'owner';
      await user.save();
    } else {
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
      return res.json({ message: 'Cashier request submitted! Pending owner or admin approval.' });
    }
  }

  await recordLastLogin(user, req.ipinfo);
  const token = generateToken(user);
  return res.json({ message: 'Google signup successful', token, user: user.toJSON() });
};

export const facebookSignupWithRole = async (req, res) => {
  const { facebookId, name, email, role } = req.body;

  if (!facebookId || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  if (role === 'admin') {
    const alreadyPending = await findPendingAdminByEmail(email);
    if (alreadyPending) {
      return res.status(409).json({ error: 'This account is already pending approval. Please wait for owner approval.' });
    }
  }

  let user = await User.findOne({ facebookId, isArchived: false });

  if (!user) {
    const byEmail = await findUserByEmail(email, { isArchived: false });
    if (byEmail) {
      const hasManual = hasPasswordLogin(byEmail);
      if (!byEmail.isVerified) {
        logAuthEvent('facebook_signup_blocked_unverified_manual', { email });
        return res.status(403).json({ error: 'Please verify your email before linking Facebook.' });
      }
      if (hasManual) {
        logAuthEvent('facebook_signup_blocked_manual_only', { email });
        return res.status(409).json({ error: 'This email already has an email/password login. Please continue signing in manually.' });
      }

      byEmail.facebookId = facebookId;
      if (!Array.isArray(byEmail.loginMethods)) byEmail.loginMethods = [];
      if (!byEmail.loginMethods.includes('facebook')) byEmail.loginMethods.push('facebook');
      user = byEmail;
      await user.save();
    } else {
      const hasOwner = await User.findOne({ role: 'owner', isArchived: false });
      if (hasOwner) {
        const settings = await SystemSettings.findOne({ id: 'system' });
        if (!settings || !settings.signupsOpen) {
          return res.status(403).json({ error: 'Sign-ups are currently closed by the owner.' });
        }
      }
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
    user.role = role;
    await user.save();
  }

  if (role === 'admin') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (!hasOwner) {
      user.role = 'owner';
      await user.save();
    } else {
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
      return res.json({ message: 'Cashier request submitted! Pending owner or admin approval.' });
    }
  }

  await recordLastLogin(user, req.ipinfo);
  const token = generateToken(user);
  return res.json({ message: 'Facebook signup successful', token, user: user.toJSON() });
};

export const requestPasswordResetCode = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const user = await findUserByEmail(sanitizedEmail, { isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!hasPasswordLogin(user)) {
    const provider = describeSocialProvider(user);
    return res.status(400).json({ error: `Password resets are disabled for ${provider} sign-in accounts. Please continue using ${provider} to access your account.` });
  }

  const code = generateCode();
  const passwordReset = new PasswordReset({
    id: uuidv4(),
    email: sanitizedEmail,
    code,
    expiresAt: new Date(Date.now() + 15 * 60 * 1000),
  });

  await passwordReset.save();

  try {
    await sendPasswordResetEmail(sanitizedEmail, code);
  } catch (err) {
    console.error('Email sending failed:', err);
    // Clean up orphaned reset code if email fails
    await passwordReset.deleteOne();
    return res.status(500).json({ error: 'Failed to send password reset email' });
  }

  res.json({ message: 'Password reset code sent to email' });
};

export const verifyResetCode = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: 'Email and code are required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();

  const reset = await findPasswordResetByEmail(sanitizedEmail, {
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  // Note: Do NOT mark as used here - will be marked as used in resetPassword
  // This allows the code to be verified without being consumed

  res.json({ message: 'Code verified successfully' });
};

export const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, code, and new password are required' });
  }

  const sanitizedEmail = String(email).trim().toLowerCase();
  if (!EMAIL_REGEX.test(sanitizedEmail)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  const reset = await findPasswordResetByEmail(sanitizedEmail, {
    code,
    used: false,
    expiresAt: { $gt: new Date() },
  });

  if (!reset) {
    return res.status(400).json({ error: 'Invalid or expired code' });
  }

  const user = await findUserByEmail(sanitizedEmail, { isArchived: false });
  if (!user) {
    return res.status(400).json({ error: 'User not found' });
  }

  if (!hasPasswordLogin(user)) {
    const provider = describeSocialProvider(user);
    return res.status(400).json({ error: `Password resets are disabled for ${provider} sign-in accounts. Please continue using ${provider} to access your account.` });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  user.password = hashed;
  user.passwordCreatedManually = true;
  if (Array.isArray(user.loginMethods) && !user.loginMethods.includes('password')) {
    user.loginMethods.push('password');
  }
  await user.save();

  const hasOwner = await User.findOne({ role: 'owner' });
  if (user.role === 'admin') {
    if (hasOwner) {
      const hashedForPending = user.password;
      await upsertPendingAdminRecord({
        id: uuidv4(),
        name: user.name,
        email: user.email,
        password: hashedForPending,
        role: 'admin',
        requestedAt: new Date(),
      });
    } else {
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
};

export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ error: 'New password must be at least 8 characters' });
  }

  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (!hasPasswordLogin(user)) {
    const provider = describeSocialProvider(user);
    return res.status(400).json({ error: `Password changes are disabled for ${provider} sign-in accounts.` });
  }

  const isCurrentValid = await bcrypt.compare(currentPassword, user.password);
  if (!isCurrentValid) {
    return res.status(401).json({ error: 'Current password is incorrect' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  user.password = hashed;
  user.passwordCreatedManually = true;
  if (Array.isArray(user.loginMethods) && !user.loginMethods.includes('password')) {
    user.loginMethods.push('password');
  }
  await user.save();

  res.json({ message: 'Password updated successfully' });
};

export const getCurrentUser = async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: user.toJSON() });
};

export const logout = async (req, res) => {
  let loggedOutAt = new Date();
  try {
    const user = await User.findOne({ id: req.user.id, isArchived: false });
    if (user) {
      await recordLastLogout(user, req.ipinfo);
      if (user.lastLogout?.at) {
        loggedOutAt = user.lastLogout.at;
      }
    }
  } catch (err) {
    console.warn('Failed to load user for logout logging:', err?.message || err);
  }

  try {
    if (typeof req.logout === 'function' && req.session) {
      req.logout({ keepSessionInfo: true }, () => {});
    }
    if (req.session) {
      req.session.destroy(() => {});
    }
    res.clearCookie('connect.sid');
  } catch (e) {
    // ignore errors to keep logout idempotent
  }

  return res.json({ message: 'Logged out', loggedOutAt });
};

export const timeoutLogout = async (req, res) => {
  const user = await User.findOne({ id: req.user.id, isArchived: false });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  await recordActivityLog(user, 'timeout_logout', req.ipinfo, new Date());
  res.json({ message: 'Timeout recorded' });
};
