// Entry point: wires environment variables, Express middleware, Passport, CSRF, routes, and schedulers.
// Useful when tracing request flow or startup logic.

// ============================================
// CRITICAL: Handle unhandled exceptions and rejections
// ============================================
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION - Server must restart:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Attempt to close DB connection (async operation, but don't wait)
    import('mongoose').then(({ default: mongoose }) => {
      if (mongoose.connection.readyState !== 0) {
        mongoose.connection.close(() => {
          console.log('✓ Database connection closed');
        });
      }
    }).catch(e => {
      console.error('Error importing mongoose:', e.message);
    });
  } catch (e) {
    console.error('Error closing database:', e.message);
  }
  
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    timestamp: new Date().toISOString()
  });
  
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
});

process.on('SIGTERM', () => {
  console.log('⚠️  SIGTERM received - initiating graceful shutdown...');
  try {
    import('mongoose').then(({ default: mongoose }) => {
      if (mongoose.connection.readyState !== 0) {
        mongoose.connection.close(() => {
          console.log('✓ Database connection closed gracefully');
        });
      }
    }).catch(e => {
      console.error('Error importing mongoose:', e.message);
    });
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

process.on('SIGINT', () => {
  console.log('⚠️  SIGINT received - initiating graceful shutdown...');
  try {
    import('mongoose').then(({ default: mongoose }) => {
      if (mongoose.connection.readyState !== 0) {
        mongoose.connection.close(() => {
          console.log('✓ Database connection closed gracefully');
        });
      }
    }).catch(e => {
      console.error('Error importing mongoose:', e.message);
    });
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 5000);
});

// ============================================
// END OF EXCEPTION HANDLERS
// ============================================

// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../.env');

// Configure dotenv before importing any modules that might use env vars
dotenv.config({ path: envPath });

// Now import other modules
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import csurf from 'csurf';
import passport from 'passport';
import rateLimit from 'express-rate-limit';
import { errorHandler } from './middleware/errorHandler.js';
import { connectDB } from './database/mongodb.js';
import { runScheduledBackupIfEnabled } from './services/driveService.js';
import { ipinfoEnricher } from './middleware/ipinfo.js';
import { idempotencyGuard } from './middleware/idempotency.js';

const app = express();
const PORT = process.env.PORT || 5000;
const isProduction = process.env.NODE_ENV === 'production';

const csrfProtection = csurf({
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
  },
  value: (req) => req.headers['x-csrf-token'] || req.headers['x-xsrf-token'] || req.body?._csrf || req.query?._csrf,
});

const windowMinutes = Number(process.env.RATE_LIMIT_WINDOW_MINUTES || 15);
const maxRequests = Number(process.env.RATE_LIMIT_MAX_REQUESTS || 500);
const safeReadPrefixes = ['/api/users', '/api/products', '/api/transactions', '/api/dashboard', '/api/settings'];
const limiter = rateLimit({
  windowMs: windowMinutes * 60 * 1000,
  limit: maxRequests,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    error: 'Too many requests. Please slow down.',
  },
  handler: (req, res, next, options) => {
    res.status(options.statusCode).json(options.message);
  },
  skip: (req) => {
    if ((req.method || '').toUpperCase() !== 'GET') return false;
    const url = req.originalUrl || req.url || '';
    return safeReadPrefixes.some((prefix) => url.startsWith(prefix));
  },
});

// Middleware
const trustProxy = process.env.RATE_LIMIT_TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production';
app.set('trust proxy', trustProxy);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// ============================================
// Request timeout middleware
// ============================================
app.use((req, res, next) => {
  req.setTimeout(30000);   // 30 seconds request timeout
  res.setTimeout(30000);   // 30 seconds response timeout
  
  const startTime = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (duration > 5000) {
      console.warn(`⚠️  Slow request: ${req.method} ${req.path} took ${duration}ms`);
    }
  });
  
  next();
});

app.use(limiter);
app.use(ipinfoEnricher);
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});
app.use(idempotencyGuard);

// Passport initialization
app.use(passport.initialize());

// Import and setup routes after passport configuration
const setupRoutes = async () => {
  try {
    // Import passport configuration after environment variables are loaded
    await import('./config/passport.js');
    
    // Import routes
    const { default: authRoutes } = await import('./routes/auth.js');
    const { default: userRoutes } = await import('./routes/users.js');
    const { default: productRoutes } = await import('./routes/products.js');
    const { default: transactionRoutes } = await import('./routes/transactions.js');
    const { default: dashboardRoutes } = await import('./routes/dashboard.js');
    const { default: settingsRoutes } = await import('./routes/settings.js');
    
    // Public/auth routes should be accessible without CSRF protection
    app.use('/api/auth', authRoutes);

    // CSRF token fetcher for clients that prefer an explicit endpoint
    app.get('/api/csrf-token', csrfProtection, (req, res) => {
      const token = req.csrfToken();
      res.cookie('XSRF-TOKEN', token, {
        sameSite: 'lax',
        secure: isProduction,
        httpOnly: false,
      });
      res.set('X-CSRF-Token', token);
      res.json({ csrfToken: token });
    });

    // Apply CSRF + token setter for authenticated routes only
    const securedMiddleware = [csrfProtection, (req, res, next) => {
      try {
        const token = req.csrfToken();
        res.locals.csrfToken = token;
        res.cookie('XSRF-TOKEN', token, {
          sameSite: 'lax',
          secure: isProduction,
          httpOnly: false,
        });
        res.set('X-CSRF-Token', token);
      } catch (err) {
        // allow downstream CSRF handler to manage errors
      }
      next();
    }];

    app.use('/api/users', securedMiddleware, userRoutes);
    app.use('/api/products', securedMiddleware, productRoutes);
    app.use('/api/transactions', securedMiddleware, transactionRoutes);
    app.use('/api/dashboard', securedMiddleware, dashboardRoutes);
    app.use('/api/settings', securedMiddleware, settingsRoutes);
  } catch (error) {
    console.error('Error setting up routes:', error);
    throw error;
  }
};

// Backup scheduler (periodic)
const startBackupScheduler = () => {
  const run = async () => {
    try {
      await runScheduledBackupIfEnabled();
    } catch (err) {
      console.error('Backup scheduler error:', err);
      // Don't crash the server, just log and continue
    }
  };
  // run once after startup delay to allow DB connection
  setTimeout(run, 60 * 1000);
  // then every 6 hours
  setInterval(run, 6 * 60 * 60 * 1000);
};

// Account Deletion Cleanup (runs daily)
const startDeletionCleanup = () => {
  const run = async () => {
    try {
      const { User } = await import('./database/mongodb.js');
      const now = new Date();
      // Use updateMany to avoid race conditions with concurrent modifications
      const result = await User.updateMany(
        { deletionScheduledFor: { $lte: now }, isArchived: false },
        { 
          isArchived: true,
          archivedAt: now,
          deletedAt: now
        }
      );
      if (result.modifiedCount > 0) {
        console.log(`Deletion cleanup: archived ${result.modifiedCount} account(s)`);
      }
    } catch (err) {
      console.error('Deletion cleanup error:', err);
    }
  };

  // Run once on startup and then daily
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
};

// Health check - includes database connectivity status
app.get('/api/health', async (req, res) => {
  try {
    const { default: mongoose } = await import('mongoose');
    const dbConnected = mongoose.connection.readyState === 1; // 1 = connected
    
    res.status(dbConnected ? 200 : 503).json({
      status: dbConnected ? 'OK' : 'DEGRADED',
      message: dbConnected ? 'Server and database are running' : 'Database connection lost',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        readyState: mongoose.connection.readyState, // 0=disconnected, 1=connected, 2=connecting, 3=disconnecting
      },
    });
  } catch (err) {
    res.status(503).json({
      status: 'ERROR',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Setup routes first (this will load passport configuration)
    await setupRoutes();
    
    // 404 handler (must be before error handler)
    app.use((req, res, next) => {
      if (res.headersSent) return next();
      res.status(404).json({ error: 'Route not found' });
    });

    // CSRF error handler should run before the global error handler
    app.use((err, req, res, next) => {
      if (err?.code === 'EBADCSRFTOKEN') {
        return res.status(403).json({ error: 'Invalid or missing CSRF token. Please refresh the page and try again.' });
      }
      return next(err);
    });

    // Error handler should be last
    app.use(errorHandler);
    
    await connectDB();

    startDeletionCleanup();
    startBackupScheduler();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
