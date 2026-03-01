/**
 * CRITICAL FIX #4 & #5: Query Timeouts and Rate Limiting
 * 
 * This adds:
 * 1. Request timeouts at the server level
 * 2. Query timeouts at the database level
 * 3. Specific rate limiters for sensitive endpoints
 */

const express = require('express');
const rateLimit = require('express-rate-limit');

// ============================================
// FIX #4: REQUEST TIMEOUTS
// ============================================

/**
 * Add request timeout to prevent hanging connections
 * Place this EARLY in your middleware stack (after express.json)
 */

module.exports.requestTimeoutMiddleware = (req, res, next) => {
  // Set timeout for the response to be sent (30 seconds)
  req.setTimeout(30000);
  res.setTimeout(30000);
  
  // Optional: Track slow requests
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) {
      console.warn(`Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
};

// Usage in server.js:
/*
const { requestTimeoutMiddleware } = require('./middleware/timeouts');
app.use(express.json());
app.use(requestTimeoutMiddleware);
app.use(routes);
*/

// ============================================
// DATABASE QUERY TIMEOUT
// ============================================

/**
 * Add to your MongoDB connection options in db.js or server.js
 */

module.exports.mongooseConfig = {
  // These are the critical timeout settings
  serverSelectionTimeoutMS: 5000,    // 5 sec to find a server
  socketTimeoutMS: 45000,             // 45 sec per operation
  
  // Connection pool settings
  maxPoolSize: 20,                    // Maximum connections
  minPoolSize: 5,                     // Minimum connections
  
  // Retry on transient errors
  retryWrites: true,
  retryReads: true,
};

// In your mongoose.connect:
/*
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 20,
  minPoolSize: 5,
  retryWrites: true,
  retryReads: true,
});
*/

// ============================================
// FIX #5: RATE LIMITERS FOR CRITICAL ENDPOINTS
// ============================================

/**
 * GENERAL RATE LIMITER (Already exists in your code)
 * This catches most endpoints
 */
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip for GET requests and health checks
    if ((req.method || '').toUpperCase() !== 'GET') return false;
    const safeReadPrefixes = ['/api/health', '/api/products', '/api/users'];
    const url = req.originalUrl || req.url || '';
    return safeReadPrefixes.some((prefix) => url.startsWith(prefix));
  },
});

/**
 * STRICT RATE LIMITERS FOR SENSITIVE ENDPOINTS
 * These should NOT be skipped for GET requests
 */

// Authentication attempts - very strict
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Only 5 attempts per IP
  message: 'Too many login attempts, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skip: false, // NO SKIP - Enforce strictly
  keyGenerator: (req) => {
    // Rate limit per IP, not per user (prevent username enumeration)
    return req.ip;
  },
});

// Password reset - moderate
const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // Only 3 attempts per hour
  message: 'Too many password reset requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Count only failures
});

// Signup - prevent account creation spam
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per hour per IP
  message: 'Too many accounts created from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Transaction creation - prevent flooding
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // 20 transactions per minute per IP
  message: 'Rate limit exceeded for transactions, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

// Bulk operations - very strict
const bulkOperationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 operations per hour
  message: 'Rate limit exceeded for bulk operations',
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// STORAGE CONFIGURATION
// ============================================

/**
 * For production, use Redis for rate limiting (not in-memory)
 * This allows rate limits to be shared across multiple servers
 */

const RedisStore = require('rate-limit-redis');
const redis = require('redis');

let limiterStore;

// Only use Redis store in production with multiple instances
if (process.env.NODE_ENV === 'production' && process.env.REDIS_URL) {
  const redisClient = redis.createClient({
    url: process.env.REDIS_URL,
  });
  
  limiterStore = new RedisStore({
    client: redisClient,
    prefix: 'rl:',
  });
  
  console.log('✓ Using Redis for rate limiting');
} else {
  console.log('⚠️  Using in-memory storage for rate limiting (not suitable for production)');
}

// Apply limiters to store
if (limiterStore) {
  authLimiter.store = limiterStore;
  passwordResetLimiter.store = limiterStore;
  signupLimiter.store = limiterStore;
  transactionLimiter.store = limiterStore;
  bulkOperationLimiter.store = limiterStore;
}

// ============================================
// EXPORT FOR USE IN ROUTES
// ============================================

module.exports = {
  generalLimiter,
  authLimiter,
  passwordResetLimiter,
  signupLimiter,
  transactionLimiter,
  bulkOperationLimiter,
  requestTimeoutMiddleware,
};

// ============================================
// USAGE IN ROUTES
// ============================================

/*
// In backend/src/routes/auth.js:

const { 
  authLimiter, 
  passwordResetLimiter,
  signupLimiter 
} = require('../middleware/rateLimiters');

router.post('/login', authLimiter, loginHandler);
router.post('/signup', signupLimiter, signupHandler);
router.post('/forgot-password', passwordResetLimiter, forgotPasswordHandler);

// In backend/src/routes/transactions.js:

const { transactionLimiter, bulkOperationLimiter } = require('../middleware/rateLimiters');

router.post('/create', transactionLimiter, createHandler);
router.post('/bulk-import', bulkOperationLimiter, bulkImportHandler);
*/

// ============================================
// MONITORING & ALERTS
// ============================================

/**
 * Add endpoint to check rate limit status
 */
const checkRateLimitStatus = (req, res) => {
  // This endpoint should be admin-only
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin only' });
  }
  
  res.json({
    message: 'Rate limiting is active',
    endpoints: {
      auth: 'Max 5 attempts per 15 minutes',
      passwordReset: 'Max 3 attempts per hour',
      signup: 'Max 5 signups per hour',
      transactions: 'Max 20 per minute',
      bulkOperations: 'Max 10 per hour',
    },
    storage: limiterStore ? 'Redis' : 'In-Memory',
  });
};

/*
// In routes:
router.get('/admin/rate-limits', checkRateLimitStatus);
*/

// ============================================
// SUMMARY
// ============================================

/*
Changes to make your system resilient:

1. REQUEST TIMEOUTS:
   - All HTTP requests timeout after 30 seconds
   - Prevents connections from hanging forever

2. DATABASE QUERY TIMEOUTS:
   - Socket operations timeout after 45 seconds
   - Server selection timeout: 5 seconds
   - Prevents slow queries from freezing the system

3. RATE LIMITING:
   - Auth: 5 attempts per 15 minutes
   - Password reset: 3 attempts per hour
   - Signup: 5 per hour
   - Transactions: 20 per minute
   - Bulk ops: 10 per hour
   - Prevents DoS and spam

4. SCALABILITY:
   - Use Redis store in production
   - Rate limits shared across multiple servers
   - Can handle horizontally scaled deployments

This transforms your system from fragile to production-ready.
*/
