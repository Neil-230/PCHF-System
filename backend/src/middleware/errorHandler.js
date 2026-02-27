// Handle MongoDB-specific errors
const handleMongoDBError = (err) => {
  const errorName = err.name || err.constructor.name;

  // MongoPoolClearedError - Connection pool issue (temporary, will retry)
  if (errorName === 'MongoPoolClearedError') {
    console.error('[MongoDB Error] Pool cleared:', err.message);
    return {
      status: 503,
      message: 'Database temporarily unavailable. Please try again.',
      isDatabaseError: true,
    };
  }

  // MongoNetworkError - Network connectivity issue
  if (errorName === 'MongoNetworkError' || errorName === 'MongoServerSelectionError') {
    console.error('[MongoDB Error] Network issue:', err.message);
    return {
      status: 503,
      message: 'Database connection lost. Please try again.',
      isDatabaseError: true,
    };
  }

  // MongoDB validation error
  if (errorName === 'MongoValidationError') {
    console.error('[MongoDB Error] Validation error:', err.message);
    return {
      status: 400,
      message: 'Invalid data provided.',
    };
  }

  // Duplicate key error (unique constraint violation)
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    console.error(`[MongoDB Error] Duplicate key on ${field}:`, err.message);
    return {
      status: 409,
      message: `${field} already exists.`,
    };
  }

  // MongoDB cast error (invalid ObjectId, type mismatch, etc.)
  if (errorName === 'CastError') {
    console.error('[MongoDB Error] Cast error:', err.message);
    return {
      status: 400,
      message: 'Invalid data format.',
    };
  }

  // Mongoose validation error
  if (errorName === 'ValidationError') {
    const messages = Object.values(err.errors || {})
      .map(e => e.message)
      .join(', ');
    console.error('[MongoDB Error] Validation error:', messages);
    return {
      status: 400,
      message: messages || 'Validation failed.',
    };
  }

  // Generic MongoDB error
  if (err.mongooseCollection || err._mongoclient || errorName.includes('Mongo')) {
    console.error('[MongoDB Error]', errorName, ':', err.message);
    return {
      status: 500,
      message: 'Database error occurred.',
      isDatabaseError: true,
    };
  }

  return null; // Not a MongoDB error
};

export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err);

  // If headers are already sent, let Express handle the error
  if (res.headersSent) {
    return next(err);
  }

  // Check for MongoDB-specific errors
  const mongoError = handleMongoDBError(err);
  if (mongoError) {
    return res.status(mongoError.status).json({
      error: mongoError.message,
      status: mongoError.status,
      ...(process.env.NODE_ENV === 'development' && { 
        mongoDbError: true,
        details: err.message 
      })
    });
  }

  // Handle other errors
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    error: message,
    status,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
};

export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};
