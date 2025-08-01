const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');
const logger = require('../utils/logger');

let redisClient;

// Initialize Redis client with error handling
const initializeRedis = async () => {
  try {
    redisClient = redis.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      retry_strategy: (options) => {
        if (options.error && options.error.code === 'ECONNREFUSED') {
          logger.warn('Redis server connection refused');
          return new Error('Redis server connection refused');
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
          logger.error('Redis retry time exhausted');
          return new Error('Retry time exhausted');
        }
        if (options.attempt > 10) {
          logger.error('Max Redis connection attempts reached');
          return undefined;
        }
        return Math.min(options.attempt * 100, 3000);
      }
    });

    redisClient.on('error', (err) => {
      logger.warn('Redis client error:', err.message);
    });

    redisClient.on('connect', () => {
      logger.info('Redis client connected');
    });

    redisClient.on('disconnect', () => {
      logger.warn('Redis client disconnected');
    });

    await redisClient.connect();
    logger.info('Redis connection established for rate limiting');
  } catch (error) {
    logger.warn('Redis not available, using memory store for rate limiting:', error.message);
    redisClient = null;
  }
};

// Initialize Redis on module load
initializeRedis();

/**
 * Creates a rate limiter with optional Redis store
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
    ...options
  };
  
  // Use Redis store if available
  if (redisClient && redisClient.isOpen) {
    try {
      config.store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
      });
    } catch (error) {
      logger.warn('Failed to create Redis store for rate limiting, using memory store');
    }
  }
  
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
  delayMs: 500, // Add 500ms delay per request above 50
  maxDelayMs: 20000, // Maximum delay of 20 seconds per request
  skipFailedRequests: false,
  skipSuccessfulRequests: false,
  onLimitReached: (req, res, options) => {
    logger.warn('Speed limit reached', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.url,
      method: req.method
    });
  }
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
const resetRateLimit = async (key) => {
  if (redisClient && redisClient.isOpen) {
    try {
      await redisClient.del(`rl:${key}`);
      logger.info(`Rate limit reset for key: ${key}`);
      return true;
    } catch (error) {
      logger.error('Error resetting rate limit:', error);
      return false;
    }
  }
  return false;
};

// Middleware to log rate limit info
const rateLimitLogger = (req, res, next) => {
  const originalSend = res.send;
  
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
  
  next();
};

// Graceful shutdown handler
process.on('SIGINT', async () => {
  if (redisClient && redisClient.isOpen) {
    await redisClient.quit();
    logger.info('Redis client disconnected on app termination');
  }
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