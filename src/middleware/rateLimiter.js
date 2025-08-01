const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const logger = require('../utils/logger');

// Log that we're using in-memory store for rate limiting
logger.info('Using in-memory store for rate limiting (Redis disabled)');

/**
 * Creates a rate limiter with in-memory store
 * @param {number} windowMs - Time window in milliseconds
 * @param {number} max - Maximum requests per window
 * @param {string} message - Error message for rate limit exceeded
 * @param {Object} options - Additional options
 * @returns {Function} Express middleware
 */
const createRateLimiter = (windowMs, max, message, options = {}) => {
  const config = {
    windowMs,
    max,
    message: {
      success: false,
      error: message,
      retryAfter: Math.ceil(windowMs / 1000),
      timestamp: new Date().toISOString()
    },
    standardHeaders: true,
    legacyHeaders: false,
    // Custom key generator for device-specific rate limiting
    keyGenerator: (req) => {
      const deviceId = req.body?.deviceId || req.params?.deviceId || req.query?.deviceId;
      const ip = req.ip || req.connection.remoteAddress;
      return deviceId ? `device:${deviceId}` : `ip:${ip}`;
    },
    // Custom handler for rate limit exceeded
    handler: (req, res) => {
      logger.warn('Rate limit exceeded', {
        key: config.keyGenerator(req),
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method
      });
      
      res.status(429).json(config.message);
    },
    // Using default in-memory store (no Redis)
    ...options
  };
  
  return rateLimit(config);
};

// Rate limiters for different endpoints
const deviceRateLimit = createRateLimiter(
  60 * 1000, // 1 minute window
  60, // 60 requests per minute per device
  'Too many location updates. Please try again later.',
  {
    skipSuccessfulRequests: false,
    skipFailedRequests: false
  }
);

const alertRateLimit = createRateLimiter(
  60 * 1000, // 1 minute window
  10, // 10 alerts per minute per device
  'Too many alerts. Please try again later.',
  {
    skipSuccessfulRequests: false,
    skipFailedRequests: true // Don't count failed requests against alert limit
  }
);

const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes window
  100, // 100 requests per 15 minutes per IP
  'Too many requests. Please try again later.',
  {
    keyGenerator: (req) => req.ip || req.connection.remoteAddress
  }
);

const authRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes window
  5, // 5 authentication attempts per 15 minutes per IP
  'Too many authentication attempts. Please try again later.',
  {
    keyGenerator: (req) => req.ip || req.connection.remoteAddress,
    skipSuccessfulRequests: true // Don't count successful auth attempts
  }
);

// Strict rate limiter for sensitive operations
const strictRateLimit = createRateLimiter(
  60 * 1000, // 1 minute window
  5, // 5 requests per minute per IP
  'Rate limit exceeded for sensitive operation. Please try again later.',
  {
    keyGenerator: (req) => req.ip || req.connection.remoteAddress
  }
);

// Slow down middleware for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // Allow 50 requests per 15 minutes at full speed
  delayMs: () => 500, // Add 500ms delay per request above 50 (updated for v2)
  maxDelayMs: 20000, // Maximum delay of 20 seconds per request
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  validate: { delayMs: false } // Disable validation warning
});

// Dynamic rate limiter based on request type
const dynamicRateLimit = (req, res, next) => {
  const endpoint = req.route?.path || req.path;
  const method = req.method;
  
  // Different limits for different endpoints
  if (endpoint.includes('/device/update-data') && method === 'POST') {
    return deviceRateLimit(req, res, next);
  } else if (endpoint.includes('/alert') && method === 'POST') {
    return alertRateLimit(req, res, next);
  } else if (endpoint.includes('/auth')) {
    return authRateLimit(req, res, next);
  } else {
    return generalRateLimit(req, res, next);
  }
};

// Helper function to reset rate limit for a specific key
// Note: In-memory store doesn't support manual reset, resets automatically on window expire
const resetRateLimit = async (key) => {
  logger.warn(`Rate limit reset requested for key: ${key}, but in-memory store doesn't support manual reset`);
  return false;
};

// Middleware to log rate limit info
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  const originalEnd = res.end;
  
  res.send = function(data) {
    if (res.statusCode === 429) {
      logger.warn('Rate limit exceeded', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        rateLimit: {
          limit: res.get('X-RateLimit-Limit'),
          remaining: res.get('X-RateLimit-Remaining'),
          reset: res.get('X-RateLimit-Reset')
        }
      });
    }
    
    originalSend.call(this, data);
  };

  // Also log speed limit delays
  res.end = function(chunk, encoding) {
    if (res.get('Retry-After')) {
      logger.warn('Speed limit reached', {
        ip: req.ip,
        userAgent: req.get('User-Agent'),
        url: req.url,
        method: req.method,
        delay: res.get('Retry-After')
      });
    }
    
    originalEnd.call(this, chunk, encoding);
  };
  
  next();
};

// Graceful shutdown handler (no Redis cleanup needed for in-memory store)
process.on('SIGINT', async () => {
  logger.info('Graceful shutdown - in-memory rate limit store will be cleared');
});

module.exports = {
  deviceRateLimit,
  alertRateLimit,
  generalRateLimit,
  authRateLimit,
  strictRateLimit,
  speedLimiter,
  dynamicRateLimit,
  rateLimitLogger,
  resetRateLimit,
  createRateLimiter
};