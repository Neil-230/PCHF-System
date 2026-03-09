/**
 * Rate limiters for critical endpoints
 * Prevents DoS attacks and spam on sensitive operations
 */

import rateLimit from 'express-rate-limit';

// ============================================
// AUTHENTICATION RATE LIMITER (Strictest)
// ============================================
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 login attempts per IP
  message: 'Too many login attempts. Please try again after 15 minutes.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => false, // NO SKIP - Enforce strictly on all methods
  keyGenerator: (req) => {
    // Rate limit per IP, not per user (prevent username enumeration)
    return req.ip;
  },
});

// ============================================
// PASSWORD RESET RATE LIMITER
// ============================================
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: 'Too many password reset requests. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Count only failures
});

// ============================================
// SIGNUP RATE LIMITER
// ============================================
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per hour per IP
  message: 'Too many account creations. Please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// TRANSACTION CREATION RATE LIMITER
// ============================================
export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 transactions per minute per IP
  message: 'Rate limit exceeded for transactions. Please slow down.',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// BULK OPERATIONS RATE LIMITER (Strictest after auth)
// ============================================
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk operations per hour
  message: 'Rate limit exceeded for bulk operations.',
  standardHeaders: true,
  legacyHeaders: false,
});
