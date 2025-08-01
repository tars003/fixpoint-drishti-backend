const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

// Import configuration and utilities
const connectDB = require('./config/database');
const config = require('./config/environment');
const logger = require('./utils/logger');
const { apiResponse } = require('./utils/apiResponse');

// Import routes
const deviceRoutes = require('./routes/deviceRoutes');
const alertRoutes = require('./routes/alertRoutes');

// Import middleware
const { generalRateLimit, speedLimiter } = require('./middleware/rateLimiter');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Create Express application
const app = express();

// Connect to MongoDB
connectDB();

// Trust proxy (important for rate limiting and IP detection)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000, // 1 year
    includeSubDomains: true,
    preload: true
  }
}));

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (config.ALLOWED_ORIGINS.includes('*') || config.ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    
    const msg = `The CORS policy for this site does not allow access from the specified Origin: ${origin}`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Origin',
    'X-Requested-With',
    'Content-Type',
    'Accept',
    'Authorization',
    'X-API-Key'
  ],
  exposedHeaders: [
    'X-RateLimit-Limit',
    'X-RateLimit-Remaining',
    'X-RateLimit-Reset'
  ]
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024
}));

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  type: ['application/json', 'text/plain']
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'info';
    
    logger[logLevel]('HTTP Request', {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      contentLength: res.get('Content-Length'),
      deviceId: req.body?.deviceId || req.params?.deviceId || req.query?.deviceId
    });
  });
  
  next();
});

// Rate limiting middleware
app.use(generalRateLimit);
app.use(speedLimiter);

// Health check endpoint (before API routes)
app.get('/health', (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    environment: config.NODE_ENV,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    api: {
      version: config.API_VERSION
    }
  };
  
  res.json(health);
});

// API status endpoint
app.get(`/api/${config.API_VERSION}/status`, (req, res) => {
  apiResponse(res, 200, 'IoT Tracking Server API is running', {
    version: config.API_VERSION,
    timestamp: new Date().toISOString(),
    endpoints: {
      devices: `/api/${config.API_VERSION}/device`,
      alerts: `/api/${config.API_VERSION}/alert`
    },
    documentation: 'See README.md for API documentation'
  });
});

// API Routes
app.use(`/api/${config.API_VERSION}/device`, deviceRoutes);
app.use(`/api/${config.API_VERSION}/alert`, alertRoutes);

// Root endpoint
app.get('/', (req, res) => {
  apiResponse(res, 200, 'Welcome to IoT Tracking Server', {
    version: process.env.npm_package_version || '1.0.0',
    apiVersion: config.API_VERSION,
    documentation: '/health for server status',
    endpoints: {
      health: '/health',
      api: `/api/${config.API_VERSION}/status`,
      devices: `/api/${config.API_VERSION}/device`,
      alerts: `/api/${config.API_VERSION}/alert`
    }
  });
});

// Catch-all 404 handler
app.use('*', notFoundHandler);

// Global error handler (must be last)
app.use(errorHandler);

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  
  const server = app.listen(config.PORT, () => {
    logger.info(`Server is listening on port ${config.PORT}`);
  });
  
  server.close(() => {
    logger.info('HTTP server closed');
    
    // Close MongoDB connection
    const mongoose = require('mongoose');
    mongoose.connection.close(() => {
      logger.info('MongoDB connection closed');
      process.exit(0);
    });
  });
  
  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

// Handle graceful shutdown
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', {
    error: err.message,
    stack: err.stack
  });
  
  // In production, you might want to restart the process
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise: promise,
    reason: reason
  });
  
  // In production, you might want to restart the process
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

// Start server
const PORT = config.PORT;
const server = app.listen(PORT, () => {
  logger.info(`🚀 IoT Tracking Server started`, {
    port: PORT,
    environment: config.NODE_ENV,
    apiVersion: config.API_VERSION,
    timestamp: new Date().toISOString(),
    processId: process.pid
  });
  
  // Log important configuration (without sensitive data)
  logger.info('Server configuration:', {
    nodeEnv: config.NODE_ENV,
    port: config.PORT,
    apiVersion: config.API_VERSION,
    mongoConnected: require('mongoose').connection.readyState === 1,
    corsOrigins: config.ALLOWED_ORIGINS.join(', '),
    logLevel: config.LOG_LEVEL
  });
});

// Export app for testing
module.exports = app;