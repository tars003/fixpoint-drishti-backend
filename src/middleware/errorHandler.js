const logger = require('../utils/logger');
const { apiResponse } = require('../utils/apiResponse');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const errorHandler = (err, req, res, next) => {
  // Log error details
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query,
    deviceId: req.body?.deviceId || req.params?.deviceId || 'unknown'
  });
  
  // Default error response
  let statusCode = err.status || err.statusCode || 500;
  let message = 'Internal server error';
  let errors = null;
  
  // Handle different types of errors
  
  // Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message,
      value: error.value
    }));
  }
  
  // Mongoose Cast Error (invalid ObjectId, etc.)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = 'Invalid data format';
    if (err.path === '_id') {
      message = 'Invalid ID format';
    }
  }
  
  // Mongoose Duplicate Key Error
  else if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    
    // Extract field name from error
    const field = Object.keys(err.keyValue)[0];
    const value = err.keyValue[field];
    
    if (field === 'deviceId') {
      message = `Device with ID '${value}' already exists`;
    } else {
      message = `${field} '${value}' already exists`;
    }
    
    errors = [{
      field,
      message: `${field} must be unique`,
      value
    }];
  }
  
  // JSON Syntax Error
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Invalid JSON format';
  }
  
  // JWT Errors
  else if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }
  else if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }
  
  // MongoDB Connection Errors
  else if (err.name === 'MongoError' || err.name === 'MongooseError') {
    statusCode = 503;
    message = 'Database service unavailable';
    
    // Don't expose MongoDB details in production
    if (process.env.NODE_ENV !== 'production') {
      message = `Database error: ${err.message}`;
    }
  }
  

  
  // Rate Limit Errors
  else if (err.status === 429) {
    statusCode = 429;
    message = 'Too many requests';
  }
  
  // Custom Application Errors
  else if (err.isOperational) {
    statusCode = err.statusCode || 400;
    message = err.message;
    errors = err.errors || null;
  }
  
  // Network/Request Timeout Errors
  else if (err.code === 'ETIMEDOUT' || err.code === 'ENOTFOUND') {
    statusCode = 504;
    message = 'Service timeout';
  }
  
  // File System Errors
  else if (err.code === 'ENOENT') {
    statusCode = 404;
    message = 'Resource not found';
  }
  else if (err.code === 'EACCES') {
    statusCode = 403;
    message = 'Access denied';
  }
  
  // Development vs Production error responses
  if (process.env.NODE_ENV === 'production') {
    // Don't expose stack traces or sensitive info in production
    if (statusCode >= 500) {
      message = 'Internal server error';
      errors = null;
    }
  } else {
    // Include more details in development
    if (statusCode >= 500 && !message.includes('error:')) {
      message = `Internal server error: ${err.message}`;
    }
  }
  
  // Send error response
  return apiResponse(res, statusCode, message, null, errors);
};

/**
 * 404 Not Found handler
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  return apiResponse(res, 404, `Route ${req.method} ${req.url} not found`);
};

/**
 * Async error wrapper to catch errors in async route handlers
 * @param {Function} fn - Async function to wrap
 * @returns {Function} Express middleware
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class for operational errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;
    this.errors = errors;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error helper
 * @param {string} message - Error message
 * @param {Array} errors - Validation errors array
 * @returns {AppError} Custom error instance
 */
const validationError = (message = 'Validation failed', errors = []) => {
  return new AppError(message, 400, errors);
};

/**
 * Not found error helper
 * @param {string} resource - Resource name
 * @returns {AppError} Custom error instance
 */
const notFoundError = (resource = 'Resource') => {
  return new AppError(`${resource} not found`, 404);
};

/**
 * Unauthorized error helper
 * @param {string} message - Error message
 * @returns {AppError} Custom error instance
 */
const unauthorizedError = (message = 'Unauthorized access') => {
  return new AppError(message, 401);
};

/**
 * Forbidden error helper
 * @param {string} message - Error message
 * @returns {AppError} Custom error instance
 */
const forbiddenError = (message = 'Forbidden') => {
  return new AppError(message, 403);
};

/**
 * Conflict error helper
 * @param {string} message - Error message
 * @returns {AppError} Custom error instance
 */
const conflictError = (message = 'Conflict') => {
  return new AppError(message, 409);
};

/**
 * Service unavailable error helper
 * @param {string} message - Error message
 * @returns {AppError} Custom error instance
 */
const serviceUnavailableError = (message = 'Service unavailable') => {
  return new AppError(message, 503);
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
  AppError,
  validationError,
  notFoundError,
  unauthorizedError,
  forbiddenError,
  conflictError,
  serviceUnavailableError
};