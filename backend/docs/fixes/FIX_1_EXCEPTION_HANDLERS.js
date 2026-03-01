/**
 * CRITICAL FIX #1: Exception Handlers for server.js
 * Add this code to the VERY TOP of backend/src/server.js
 * Before any other code runs
 */

'use strict';

// ============================================
// CRITICAL: Handle unhandled exceptions and rejections
// ============================================

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION - Server must restart:', {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString()
  });
  
  // Attempt graceful cleanup
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      mongoose.connection.close(() => {
        console.log('✓ Database connection closed');
      });
    }
  } catch (e) {
    console.error('Error closing database:', e.message);
  }
  
  // Exit process - supervisor should restart it
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED PROMISE REJECTION:', {
    reason: reason instanceof Error ? reason.message : String(reason),
    timestamp: new Date().toISOString()
  });
  
  // Log full error if it's an Error object
  if (reason instanceof Error) {
    console.error('Stack trace:', reason.stack);
  }
  
  // NOTE: Not exiting here - try to keep server running
  // but this error was NOT caught properly in the code
});

// Handle graceful shutdown signals
process.on('SIGTERM', async () => {
  console.log('⚠️  SIGTERM received - initiating graceful shutdown...');
  
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✓ Database connection closed gracefully');
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
  }
  
  // Exit with success code
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('⚠️  SIGINT received - initiating graceful shutdown...');
  
  try {
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
      console.log('✓ Database connection closed gracefully');
    }
  } catch (error) {
    console.error('Error during graceful shutdown:', error.message);
  }
  
  process.exit(0);
});

// ============================================
// Now continue with rest of server.js
// ============================================
