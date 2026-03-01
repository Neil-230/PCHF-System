import express from 'express';
import { verifyRecaptcha, verifyToken } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { authLimiter, passwordResetLimiter, signupLimiter } from '../middleware/rateLimiters.js';
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

router.post('/signup', signupLimiter, asyncHandler(signup));

router.post('/verify-email', asyncHandler(verifyEmail));

router.post('/login', authLimiter, verifyRecaptcha, asyncHandler(login));

// ============ GOOGLE OAUTH ============
router.get('/google', startGoogleOAuth);

router.get('/google/callback', handleGoogleCallback);

// ============ FACEBOOK OAUTH ============
router.get('/facebook', startFacebookOAuth);

router.get('/facebook/callback', handleFacebookCallback);

// ============ GOOGLE SIGNUP WITH ROLE ============
router.post('/google-signup-role', signupLimiter, asyncHandler(googleSignupWithRole));

router.post('/facebook-signup-role', signupLimiter, asyncHandler(facebookSignupWithRole));

// ============ FORGOT PASSWORD - REQUEST CODE ============
router.post('/forgot-password', passwordResetLimiter, asyncHandler(requestPasswordResetCode));

router.post('/verify-reset-code', asyncHandler(verifyResetCode));

router.post('/reset-password', passwordResetLimiter, asyncHandler(resetPassword));

router.post('/change-password', verifyToken, asyncHandler(changePassword));

router.get('/me', verifyToken, asyncHandler(getCurrentUser));

router.post('/logout', verifyToken, asyncHandler(logout));

router.post('/timeout-logout', verifyToken, asyncHandler(timeoutLogout));

export default router;
