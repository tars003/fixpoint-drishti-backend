const jwt = require('jsonwebtoken');
const { unauthorizedResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { unauthorizedError } = require('./errorHandler');

/**
 * JWT Token authentication middleware
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateToken = (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    
    if (!token) {
      logger.warn('No token provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      return unauthorizedResponse(res, 'Access token required');
    }
    
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        logger.warn('Invalid token', {
          error: err.message,
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          url: req.url,
          method: req.method
        });
        
        if (err.name === 'TokenExpiredError') {
          return unauthorizedResponse(res, 'Token has expired');
        } else if (err.name === 'JsonWebTokenError') {
          return unauthorizedResponse(res, 'Invalid token format');
        } else {
          return unauthorizedResponse(res, 'Token verification failed');
        }
      }
      
      req.user = decoded;
      next();
    });
    
  } catch (error) {
    logger.error('Token authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * API Key authentication middleware (simpler alternative for IoT devices)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authenticateApiKey = (req, res, next) => {
  try {
    const apiKey = req.headers['x-api-key'] || req.query.apiKey;
    
    if (!apiKey) {
      logger.warn('No API key provided', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        deviceId: req.body?.deviceId || req.params?.deviceId || 'unknown'
      });
      return unauthorizedResponse(res, 'API key required');
    }
    
    // In production, you might want to store API keys in database with different permissions
    const validApiKeys = process.env.API_KEYS ? process.env.API_KEYS.split(',') : [];
    const masterApiKey = process.env.API_KEY;
    
    if (!masterApiKey && validApiKeys.length === 0) {
      logger.error('No API keys configured in environment');
      return unauthorizedResponse(res, 'Authentication not configured');
    }
    
    const isValidKey = apiKey === masterApiKey || validApiKeys.includes(apiKey);
    
    if (!isValidKey) {
      logger.warn('Invalid API key', {
        providedKey: apiKey.substring(0, 8) + '...', // Log partial key for debugging
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        deviceId: req.body?.deviceId || req.params?.deviceId || 'unknown'
      });
      return unauthorizedResponse(res, 'Invalid API key');
    }
    
    // Add API key info to request for logging/auditing
    req.apiKey = {
      key: apiKey.substring(0, 8) + '...',
      type: apiKey === masterApiKey ? 'master' : 'standard'
    };
    
    logger.debug('API key authentication successful', {
      keyType: req.apiKey.type,
      ip: req.ip,
      deviceId: req.body?.deviceId || req.params?.deviceId || 'unknown'
    });
    
    next();
    
  } catch (error) {
    logger.error('API key authentication error:', error);
    return unauthorizedResponse(res, 'Authentication failed');
  }
};

/**
 * Device ID validation middleware (ensures device can only access its own data)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const validateDeviceAccess = (req, res, next) => {
  try {
    const requestDeviceId = req.body?.deviceId || req.params?.deviceId || req.query?.deviceId;
    const authenticatedDeviceId = req.user?.deviceId || req.device?.deviceId;
    
    // Skip validation if no device ID in request (e.g., general queries)
    if (!requestDeviceId) {
      return next();
    }
    
    // Skip validation for master API key
    if (req.apiKey?.type === 'master') {
      return next();
    }
    
    // Check if device is accessing its own data
    if (authenticatedDeviceId && requestDeviceId !== authenticatedDeviceId) {
      logger.warn('Device access violation', {
        requestedDeviceId: requestDeviceId,
        authenticatedDeviceId: authenticatedDeviceId,
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      return unauthorizedResponse(res, 'Access denied: Device can only access its own data');
    }
    
    next();
    
  } catch (error) {
    logger.error('Device access validation error:', error);
    return unauthorizedResponse(res, 'Access validation failed');
  }
};

/**
 * Optional authentication middleware (allows both authenticated and anonymous access)
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;
  
  if (authHeader) {
    return authenticateToken(req, res, next);
  } else if (apiKey) {
    return authenticateApiKey(req, res, next);
  } else {
    // No authentication provided, continue as anonymous
    next();
  }
};

/**
 * Role-based access control middleware
 * @param {Array} roles - Required roles
 * @returns {Function} Express middleware
 */
const requireRoles = (roles = []) => {
  return (req, res, next) => {
    if (!req.user && !req.apiKey) {
      return unauthorizedResponse(res, 'Authentication required');
    }
    
    // Master API key has all permissions
    if (req.apiKey?.type === 'master') {
      return next();
    }
    
    const userRoles = req.user?.roles || [];
    const hasRequiredRole = roles.some(role => userRoles.includes(role));
    
    if (!hasRequiredRole) {
      logger.warn('Insufficient permissions', {
        requiredRoles: roles,
        userRoles: userRoles,
        userId: req.user?.id || 'unknown',
        ip: req.ip,
        url: req.url,
        method: req.method
      });
      return unauthorizedResponse(res, 'Insufficient permissions');
    }
    
    next();
  };
};

/**
 * Generate JWT token for device
 * @param {string} deviceId - Device ID
 * @param {Object} additionalClaims - Additional claims to include in token
 * @returns {string} JWT token
 */
const generateDeviceToken = (deviceId, additionalClaims = {}) => {
  const payload = {
    deviceId,
    type: 'device',
    ...additionalClaims
  };
  
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    issuer: 'iot-tracking-server',
    audience: 'iot-device'
  });
};

/**
 * Verify and decode token without middleware
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error(`Token verification failed: ${error.message}`);
  }
};

/**
 * Rate limiting bypass for authenticated requests
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const authRateLimitBypass = (req, res, next) => {
  if (req.user || req.apiKey) {
    // Authenticated requests get higher rate limits
    req.rateLimit = {
      authenticated: true,
      multiplier: 2 // Double the rate limit for authenticated requests
    };
  }
  next();
};

/**
 * Security headers middleware for authenticated routes
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const securityHeaders = (req, res, next) => {
  // Add security headers
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Add authentication info to response headers (for debugging)
  if (process.env.NODE_ENV !== 'production') {
    if (req.user) {
      res.setHeader('X-Auth-Type', 'jwt');
      res.setHeader('X-Auth-Device', req.user.deviceId || 'unknown');
    } else if (req.apiKey) {
      res.setHeader('X-Auth-Type', 'api-key');
      res.setHeader('X-Auth-Key-Type', req.apiKey.type);
    }
  }
  
  next();
};

module.exports = {
  authenticateToken,
  authenticateApiKey,
  validateDeviceAccess,
  optionalAuth,
  requireRoles,
  generateDeviceToken,
  verifyToken,
  authRateLimitBypass,
  securityHeaders
};