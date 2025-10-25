import express from 'express';
import jwt from 'jsonwebtoken';
import passport from 'passport';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { User, PasswordReset, PendingAdmin } from '../database/mongodb.js';
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

  // Check if user exists
  const existingUser = await User.findOne({ email });
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

  const user = await User.findOne({ email });
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

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'No account found with this email.' });
  }

  // If account was created via Google only (no manual password)
  const googleOnly = !!user.googleId && Array.isArray(user.loginMethods) && !user.loginMethods.includes('password');
  if (googleOnly) {
    return res.status(400).json({ error: 'You signed up with Google. Please use Google Sign-In.' });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    return res.status(401).json({ error: 'Incorrect password.' });
  }

  if (!user.isVerified) {
    return res.status(403).json({ error: 'Please verify your email before logging in.' });
  }

  // If admin is pending owner approval, block login
  if (user.role === 'admin') {
    const pending = await PendingAdmin.findOne({ email: user.email });
    if (pending) {
      return res.status(403).json({ error: 'Please wait for the owner to approve your account.' });
    }
  }

  const token = generateToken(user);

  res.json({
    message: 'Login successful',
    token,
    user: user.toJSON(),
  });
}));

// ============ GOOGLE OAUTH ============
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

router.get('/google/callback', (req, res, next) => {
  const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:5173';
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      return res.redirect(`${FRONTEND}/login?error=oauth_failed`);
    }
    if (!user) {
      // If user not found, pass minimal profile data to frontend to complete signup (role selection)
      const profile = info && info.profile ? encodeURIComponent(JSON.stringify(info.profile)) : '';
      return res.redirect(`${FRONTEND}/auth/google-callback?signup=required&user=${profile}`);
    }
    const token = generateToken(user);
    return res.redirect(`${FRONTEND}/auth/google-callback?token=${token}&user=${encodeURIComponent(JSON.stringify(user.toJSON()))}`);
  })(req, res, next);
});

// ============ GOOGLE SIGNUP WITH ROLE ============
router.post('/google-signup-role', asyncHandler(async (req, res) => {
  const { googleId, name, email, role } = req.body;

  if (!googleId || !name || !email || !role) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Try to find user by Google ID first
  let user = await User.findOne({ googleId });

  if (!user) {
    // Attempt merge by email
    const byEmail = await User.findOne({ email });
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
          const hasOwner = await User.findOne({ role: 'owner' });
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
      await PendingAdmin.findOneAndUpdate(
        { email },
        {
          id: uuidv4(),
          name,
          email,
          role: 'admin',
          password: user.password,
          requestedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      try {
        await sendAdminApprovalEmail(email, name);
      } catch (err) {
        console.error('Email sending failed:', err);
      }
      // Do not issue a token while pending approval
      return res.json({ message: 'Admin request submitted! Pending owner approval.' });
    }
  }

  const token = generateToken(user);
  return res.json({
    message: 'Google signup successful',
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

  const user = await User.findOne({ email });
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

  const user = await User.findOne({ email });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const hashed = await bcrypt.hash(newPassword, 12);
  user.password = hashed;
  user.passwordCreatedManually = true;
  if (Array.isArray(user.loginMethods) && !user.loginMethods.includes('password')) {
    user.loginMethods.push('password');
  }
  await user.save();

  // If user selected admin and an owner already exists, mark as pending approval or promote first admin to owner
  if (user.role === 'admin') {
    const hasOwner = await User.findOne({ role: 'owner' });
    if (hasOwner) {
      // Upsert PendingAdmin record to ensure owner approval gate
      const hashedForPending = user.password; // already hashed above
      await PendingAdmin.findOneAndUpdate(
        { email: user.email },
        {
          id: uuidv4(),
          name: user.name,
          email: user.email,
          password: hashedForPending,
          role: 'admin',
          requestedAt: new Date(),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    } else {
      // No owner yet; promote first admin to owner
      user.role = 'owner';
      await user.save();
    }
  }

  reset.used = true;
  await reset.save();

  return res.json({ message: 'Password reset successfully' });
}));

// ============ GET CURRENT USER ============
router.get('/me', verifyToken, asyncHandler(async (req, res) => {
  const user = await User.findOne({ id: req.user.id });
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  res.json({ user: user.toJSON() });
}));

export default router;
