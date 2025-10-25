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
import session from 'express-session';
import passport from 'passport';
import { errorHandler } from './middleware/errorHandler.js';
import { connectDB } from './database/mongodb.js';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  secret: process.env.JWT_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

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
    
    // Setup routes
    app.use('/api/auth', authRoutes);
    app.use('/api/users', userRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/transactions', transactionRoutes);
    app.use('/api/dashboard', dashboardRoutes);
  } catch (error) {
    console.error('Error setting up routes:', error);
    throw error;
  }
};

// Account Deletion Cleanup (runs daily)
const startDeletionCleanup = () => {
  const run = async () => {
    try {
      const { User } = await import('./database/mongodb.js');
      const now = new Date();
      const res = await User.deleteMany({ deletionScheduledFor: { $lte: now } });
      if (res.deletedCount) {
        console.log(`Deletion cleanup: removed ${res.deletedCount} account(s)`);
      }
    } catch (err) {
      console.error('Deletion cleanup error:', err);
    }
  };

  // Run once on startup and then daily
  run();
  setInterval(run, 24 * 60 * 60 * 1000);
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// Connect to MongoDB and start server
const startServer = async () => {
  try {
    // Setup routes first (this will load passport configuration)
    await setupRoutes();
    
    // Add error handling middleware after routes are set up
    app.use(errorHandler);

    // 404 handler (must be last)
    app.use((req, res) => {
      res.status(404).json({ error: 'Route not found' });
    });
    
    await connectDB();

    startDeletionCleanup();

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
};

startServer();
