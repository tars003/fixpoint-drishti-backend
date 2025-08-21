const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const { AppError } = require('./errorHandler');

/**
 * JWT Secret for payload encryption/decryption
 * In production, this should be stored as an environment variable
 * and shared securely with ESP32 devices
 */
const JWT_PAYLOAD_SECRET = process.env.JWT_PAYLOAD_SECRET || 'iot_device_payload_secret_2025';

/**
 * Middleware to decode JWT-encoded payloads from ESP32 devices
 * Expects the request body to contain a JWT token that, when decoded,
 * contains the actual sensor/alert data
 */
const decodeJwtPayload = (req, res, next) => {
  try {
    // Skip JWT decoding if body is already an object (for backward compatibility)
    if (typeof req.body === 'object' && req.body !== null && !req.body.token) {
      logger.debug('Standard JSON payload detected, skipping JWT decode', {
        path: req.path,
        hasToken: false
      });
      return next();
    }

    let token;
    
    // Check if body contains a JWT token
    if (typeof req.body === 'string') {
      // Raw JWT token in body
      token = req.body;
    } else if (req.body && req.body.token) {
      // JWT token in { "token": "..." } format
      token = req.body.token;
    } else {
      logger.warn('No JWT token found in request body', {
        path: req.path,
        bodyType: typeof req.body,
        body: req.body
      });
      throw new AppError('JWT token required in request body', 400);
    }

    // Verify and decode JWT token
    const decoded = jwt.verify(token, JWT_PAYLOAD_SECRET, {
      algorithms: ['HS256'], // Only allow HMAC SHA-256
      maxAge: '5m' // Token expires in 5 minutes (prevents replay attacks)
    });

    // Log successful JWT decode
    logger.info('JWT payload decoded successfully', {
      path: req.path,
      deviceId: decoded.deviceId || 'unknown',
      tokenAge: decoded.iat ? Math.floor(Date.now() / 1000) - decoded.iat : null,
      ip: req.ip
    });

    // Replace request body with decoded data
    req.body = decoded;
    
    // Store original token info for logging
    req.jwtInfo = {
      issuer: decoded.iss || 'esp32',
      issuedAt: decoded.iat,
      expiresAt: decoded.exp,
      tokenUsed: true
    };

    next();

  } catch (error) {
    logger.error('JWT payload decode failed', {
      error: error.message,
      path: req.path,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      bodyPreview: typeof req.body === 'string' ? req.body.substring(0, 50) + '...' : 'object'
    });

    // Handle specific JWT errors
    if (error.name === 'JsonWebTokenError') {
      throw new AppError('Invalid JWT token format', 400, [{
        field: 'token',
        message: 'JWT token is malformed or invalid'
      }]);
    } else if (error.name === 'TokenExpiredError') {
      throw new AppError('JWT token has expired', 401, [{
        field: 'token',
        message: 'JWT token is expired, please generate a new one'
      }]);
    } else if (error.name === 'NotBeforeError') {
      throw new AppError('JWT token not yet valid', 401, [{
        field: 'token',
        message: 'JWT token is not yet valid'
      }]);
    } else {
      // Re-throw AppErrors as-is, wrap others
      if (error instanceof AppError) {
        throw error;
      } else {
        throw new AppError('JWT token processing failed', 500);
      }
    }
  }
};

/**
 * Utility function to generate JWT tokens for testing
 * @param {Object} payload - Data to encode
 * @param {Object} options - JWT options (expiresIn, issuer, etc.)
 * @returns {String} JWT token
 */
const generateJwtPayload = (payload, options = {}) => {
  const defaultOptions = {
    expiresIn: '5m',
    issuer: 'esp32',
    algorithm: 'HS256'
  };

  const jwtOptions = { ...defaultOptions, ...options };
  
  return jwt.sign(payload, JWT_PAYLOAD_SECRET, jwtOptions);
};

/**
 * Middleware to optionally decode JWT payloads
 * Tries JWT decoding first, falls back to standard JSON if not a JWT
 */
const optionalJwtDecode = (req, res, next) => {
  try {
    // Try JWT decoding
    decodeJwtPayload(req, res, (err) => {
      if (err) {
        // If JWT decode failed, check if it's a standard JSON payload
        if (typeof req.body === 'object' && req.body !== null && !req.body.token) {
          logger.debug('Falling back to standard JSON payload', {
            path: req.path
          });
          return next(); // Continue with standard JSON
        } else {
          throw err; // Re-throw JWT errors
        }
      }
      next(); // JWT decode successful
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  decodeJwtPayload,
  optionalJwtDecode,
  generateJwtPayload,
  JWT_PAYLOAD_SECRET
};
