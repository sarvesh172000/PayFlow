const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Error occurred:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Default error
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let errorCode = err.code || 'INTERNAL_ERROR';

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
    errorCode = 'INVALID_TOKEN';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
    errorCode = 'TOKEN_EXPIRED';
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }

  // Database errors
  if (err.code && err.code.startsWith('23')) { // PostgreSQL constraint violations
    statusCode = 400;
    errorCode = 'DATABASE_CONSTRAINT_VIOLATION';
  }

  res.status(statusCode).json({
    error: errorCode,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

module.exports = errorHandler;
