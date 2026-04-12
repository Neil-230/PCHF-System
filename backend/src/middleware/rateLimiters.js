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
  max: 2, // Relaxed to 30 login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many login attempts. Please try again after 15 minutes.',
  },
  handler: (req, res, _next, options) => {
    const retryAfter = res.getHeader('Retry-After');
    res.status(options.statusCode).json({
      ...options.message,
      retryAfter: parseInt(retryAfter, 10) || 0,
    });
  },
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
  max: 20, // Only 3 attempts per hour
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Count only failures
  message: {
    error: 'Too many password reset requests. Please try again later.',
  },
  handler: (req, res, _next, options) => {
    const retryAfter = res.getHeader('Retry-After');
    res.status(options.statusCode).json({
      ...options.message,
      retryAfter: parseInt(retryAfter, 10) || 0,
    });
  },
});

// ============================================
// SIGNUP RATE LIMITER
// ============================================
export const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // 5 signups per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many account creations. Please try again later.',
  },
  handler: (req, res, _next, options) => {
    const retryAfter = res.getHeader('Retry-After');
    res.status(options.statusCode).json({
      ...options.message,
      retryAfter: parseInt(retryAfter, 10) || 0,
    });
  },
});

// ============================================
// TRANSACTION CREATION RATE LIMITER
// ============================================
export const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 transactions per minute per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded for transactions. Please slow down.',
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});

// ============================================
// BULK OPERATIONS RATE LIMITER (Strictest after auth)
// ============================================
export const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 15, // 10 bulk operations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Rate limit exceeded for bulk operations.',
  },
  handler: (req, res, _next, options) => {
    res.status(options.statusCode).json(options.message);
  },
});
