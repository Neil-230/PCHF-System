/**
 * CRITICAL FIX #3: Session Management Issue
 * 
 * File: backend/src/controllers/transactionsController.js
 * Lines: 93-220 (approximately)
 * 
 * PROBLEM:
 * If an error is thrown during session operations, the session might
 * not properly close, causing connection pool exhaustion.
 * 
 * CURRENT CODE (PROBLEMATIC):
 * const session = await mongoose.startSession();
 * try {
 *   await session.withTransaction(async () => { ... });
 *   res.status(201).json({ ... });
 * } catch (err) {
 *   throw err;  // ❌ Session might not close if this re-throws
 * } finally {
 *   session.endSession();
 * }
 */

// ============================================
// FIXED VERSION
// ============================================

const mongoose = require('mongoose');

/**
 * Safe wrapped transaction handler
 * Ensures session is ALWAYS closed, even on errors
 */
async function executeWithTransaction(callback) {
  let session = null;
  
  try {
    // Start session
    session = await mongoose.startSession();
    
    // Execute transaction with automatic rollback on error
    const result = await session.withTransaction(
      async () => {
        return await callback(session);
      },
      {
        // Transaction options for better safety
        readConcern: { level: 'snapshot' },
        writeConcern: { w: 'majority' },
        readPreference: 'primary',
        maxCommitTimeMS: 30000, // Timeout transaction after 30 seconds
      }
    );
    
    return result;
    
  } catch (error) {
    // Log the error with full context
    console.error('Transaction error:', {
      message: error.message,
      code: error.code,
      codeName: error.codeName,
      name: error.name,
      timestamp: new Date().toISOString(),
    });
    
    // Re-throw with context
    throw error;
    
  } finally {
    // CRITICAL: Always close session, even if errors occurred
    if (session) {
      try {
        await session.endSession();
      } catch (sessionError) {
        console.error('Error closing session:', sessionError.message);
        // Don't throw here - we're already in error handling
      }
    }
  }
}

// ============================================
// EXAMPLE USAGE IN CONTROLLER
// ============================================

// Before (problematic):
/*
exports.createTransaction = async (req, res, next) => {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      // ... create transaction code ...
    });
    res.status(201).json({ ... });
  } catch (err) {
    next(err);
  } finally {
    session.endSession();
  }
};
*/

// After (safe):
exports.createTransaction = async (req, res, next) => {
  try {
    const transaction = await executeWithTransaction(async (session) => {
      // All your transaction creation code here
      // Session is automatically managed
      
      const inv = await Inventory.updateOne(
        { _id: inventoryId },
        { $inc: { quantity: -qty } },
        { session }
      );
      
      // ... more operations ...
      
      const txn = new Transaction({
        // ... transaction data ...
      });
      
      await txn.save({ session });
      return txn;
    });
    
    res.status(201).json(transaction.toJSON());
    
  } catch (error) {
    // Check for specific errors
    if (error.name === 'VersionError' || error.codeName === 'WriteConflict') {
      return res.status(409).json({ 
        error: 'Conflict: inventory was updated concurrently. Please retry.' 
      });
    }
    
    // Let error handler middleware deal with it
    next(error);
  }
};

// ============================================
// ERROR RECOVERY PATTERN
// ============================================

/**
 * For endpoints that might get WriteConflict errors,
 * implement automatic retry with exponential backoff
 */

async function executeWithRetry(
  callback,
  maxRetries = 3,
  delayMs = 100
) {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await executeWithTransaction(callback);
      
    } catch (error) {
      lastError = error;
      
      // Only retry on WriteConflict or VersionError
      if (
        (error.codeName === 'WriteConflict' || 
         error.name === 'VersionError') &&
        attempt < maxRetries
      ) {
        console.warn(`Transaction conflict (attempt ${attempt}/${maxRetries}), retrying...`);
        
        // Exponential backoff: 100ms, 200ms, 400ms
        const delay = delayMs * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Other errors or max retries reached
      throw error;
    }
  }
  
  throw lastError;
}

// Usage:
/*
const transaction = await executeWithRetry(async (session) => {
  // ... transaction code ...
}, 
3, // max 3 retries
100 // initial 100ms delay
);
*/

// ============================================
// MONITORING SESSION POOL
// ============================================

/**
 * Add this to your health check endpoint to monitor connection pool
 */
function getConnectionPoolStatus() {
  const db = mongoose.connection;
  
  return {
    state: db.readyState,
    stateNames: {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting'
    },
    client: {
      status: db.client?.topology?.s?.pool?.totalConnectionCount || 0,
      available: db.client?.topology?.s?.pool?.availableConnectionCount || 0
    }
  };
}

// Add to health check:
/*
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    database: getConnectionPoolStatus()
  });
});
*/

// ============================================
// SUMMARY OF CHANGES
// ============================================

/*
1. Use executeWithTransaction() wrapper for all transactional code
2. Ensures session is always closed (finally block)
3. Implements error logging and proper error re-throwing
4. Add transaction options (timeouts, consistency levels)
5. Use executeWithRetry() for conflict-prone operations
6. Add connection pool monitoring

This prevents connection leaks and keeps the server stable.
*/
