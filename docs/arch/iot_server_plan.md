# Complete IoT Tracking Server Development Plan

## Project Overview
Build a Node.js server for ESP32-based IoT tracking system with SIM800L GSM and NEO6M GPS modules, using MongoDB Atlas for data storage and Docker for containerization.

## 1. Project Structure

```
iot-tracking-server/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── environment.js
│   │   └── rateLimiter.js
│   ├── models/
│   │   ├── Device.js
│   │   ├── LocationData.js
│   │   └── Alert.js
│   ├── routes/
│   │   ├── deviceRoutes.js
│   │   └── alertRoutes.js
│   ├── controllers/
│   │   ├── deviceController.js
│   │   └── alertController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── validation.js
│   │   ├── rateLimiter.js
│   │   └── errorHandler.js
│   ├── validators/
│   │   ├── deviceValidator.js
│   │   └── alertValidator.js
│   ├── utils/
│   │   ├── logger.js
│   │   ├── apiResponse.js
│   │   └── helpers.js
│   └── app.js
├── tests/
├── .env.example
├── .env
├── .dockerignore
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

## 2. Dependencies to Install

```json
{
  "dependencies": {
    "express": "^4.19.2",
    "mongoose": "^8.3.2",
    "joi": "^17.12.3",
    "helmet": "^7.1.0",
    "cors": "^2.8.5",
    "express-rate-limit": "^7.2.0",
    "rate-limit-redis": "^4.2.0",
    "redis": "^4.6.13",
    "dotenv": "^16.4.5",
    "winston": "^3.13.0",
    "compression": "^1.7.4",
    "express-validator": "^7.0.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.2",
    "express-slow-down": "^2.0.1"
  },
  "devDependencies": {
    "nodemon": "^3.1.0",
    "jest": "^29.7.0",
    "supertest": "^7.0.0"
  }
}
```

## 3. Environment Variables (.env file)

```env
# Server Configuration
NODE_ENV=production
PORT=3000
API_VERSION=v1

# MongoDB Configuration
MONGODB_URI=your_mongodb_atlas_connection_string
DB_NAME=iot_tracking

# Redis Configuration (for rate limiting)
REDIS_URL=redis://localhost:6379

# JWT Configuration
JWT_SECRET=your_very_secure_jwt_secret
JWT_EXPIRES_IN=7d

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
ALERT_RATE_LIMIT_MAX=10

# Logging
LOG_LEVEL=info
```

## 4. MongoDB Schema Design (Time Series Optimized)

### Device Model
```javascript
// src/models/Device.js
const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  description: String,
  isActive: {
    type: Boolean,
    default: true
  },
  lastSeen: {
    type: Date,
    default: Date.now
  },
  batteryThreshold: {
    type: Number,
    default: 20 // Alert when battery below 20%
  },
  alertSettings: {
    vibrationEnabled: { type: Boolean, default: true },
    tamperingEnabled: { type: Boolean, default: true },
    lowBatteryEnabled: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Indexes for performance
deviceSchema.index({ deviceId: 1 });
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ lastSeen: -1 });

module.exports = mongoose.model('Device', deviceSchema);
```

### Location Data Model (Time Series Collection)
```javascript
// src/models/LocationData.js
const mongoose = require('mongoose');

const locationDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    ref: 'Device'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  altitude: Number,
  speed: Number,
  course: Number,
  accuracy: Number,
  satellites: Number,
  batteryVoltage: {
    type: Number,
    required: true
  },
  digitalInputs: {
    type: Map,
    of: Boolean
  },
  analogInputs: {
    type: Map,
    of: Number
  },
  signalStrength: Number,
  timestamp: {
    type: Date,
    required: true,
    default: Date.now
  }
}, {
  timeseries: {
    timeField: 'timestamp',
    metaField: 'deviceId',
    granularity: 'minutes'
  }
});

// Geospatial index for location queries
locationDataSchema.index({ location: '2dsphere' });
locationDataSchema.index({ deviceId: 1, timestamp: -1 });

module.exports = mongoose.model('LocationData', locationDataSchema);
```

### Alert Model
```javascript
// src/models/Alert.js
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: true,
    ref: 'Device'
  },
  alertType: {
    type: String,
    required: true,
    enum: ['vibration', 'tampering', 'low_battery', 'geofence', 'offline']
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  message: {
    type: String,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: [Number]
  },
  data: {
    type: mongoose.Schema.Types.Mixed // Additional alert-specific data
  },
  isResolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: Date,
  timestamp: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Indexes
alertSchema.index({ deviceId: 1, timestamp: -1 });
alertSchema.index({ alertType: 1 });
alertSchema.index({ isResolved: 1 });
alertSchema.index({ severity: 1 });

module.exports = mongoose.model('Alert', alertSchema);
```

## 5. Data Validation Schemas

### Device Data Validator
```javascript
// src/validators/deviceValidator.js
const Joi = require('joi');

const locationDataSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).required()
    .messages({
      'string.empty': 'Device ID is required',
      'string.alphanum': 'Device ID must contain only alphanumeric characters',
      'string.min': 'Device ID must be at least 3 characters',
      'string.max': 'Device ID must not exceed 50 characters'
    }),
  
  latitude: Joi.number().min(-90).max(90).required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'number.base': 'Latitude must be a valid number'
    }),
  
  longitude: Joi.number().min(-180).max(180).required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'number.base': 'Longitude must be a valid number'
    }),
  
  altitude: Joi.number().optional(),
  speed: Joi.number().min(0).optional(),
  course: Joi.number().min(0).max(360).optional(),
  accuracy: Joi.number().min(0).optional(),
  satellites: Joi.number().integer().min(0).max(50).optional(),
  
  batteryVoltage: Joi.number().min(0).max(50).required()
    .messages({
      'number.base': 'Battery voltage must be a valid number',
      'number.min': 'Battery voltage cannot be negative',
      'any.required': 'Battery voltage is required'
    }),
  
  digitalInputs: Joi.object().pattern(
    Joi.string(),
    Joi.boolean()
  ).optional(),
  
  analogInputs: Joi.object().pattern(
    Joi.string(),
    Joi.number().min(0).max(1024)
  ).optional(),
  
  signalStrength: Joi.number().min(-120).max(0).optional(),
  
  timestamp: Joi.date().optional()
});

const alertSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).required(),
  alertType: Joi.string().valid('vibration', 'tampering', 'low_battery', 'geofence', 'offline').required(),
  severity: Joi.string().valid('low', 'medium', 'high', 'critical').default('medium'),
  message: Joi.string().min(1).max(500).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  data: Joi.object().optional()
});

module.exports = {
  locationDataSchema,
  alertSchema
};
```

## 6. API Controllers

### Device Controller
```javascript
// src/controllers/deviceController.js
const LocationData = require('../models/LocationData');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { apiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const updateDeviceData = async (req, res) => {
  try {
    const { deviceId, latitude, longitude, batteryVoltage, ...otherData } = req.body;
    
    // Update device last seen
    await Device.findOneAndUpdate(
      { deviceId },
      { lastSeen: new Date() },
      { upsert: true }
    );
    
    // Create location data entry
    const locationData = new LocationData({
      deviceId,
      location: {
        coordinates: [longitude, latitude]
      },
      batteryVoltage,
      ...otherData,
      timestamp: new Date()
    });
    
    await locationData.save();
    
    // Check for low battery alert
    const device = await Device.findOne({ deviceId });
    if (device && batteryVoltage < (device.batteryThreshold || 20)) {
      await createLowBatteryAlert(deviceId, batteryVoltage, [longitude, latitude]);
    }
    
    logger.info(`Location data updated for device ${deviceId}`);
    
    return apiResponse(res, 200, 'Data updated successfully', {
      deviceId,
      timestamp: locationData.timestamp
    });
    
  } catch (error) {
    logger.error('Error updating device data:', error);
    return apiResponse(res, 500, 'Internal server error');
  }
};

const createLowBatteryAlert = async (deviceId, batteryVoltage, coordinates) => {
  try {
    const alert = new Alert({
      deviceId,
      alertType: 'low_battery',
      severity: batteryVoltage < 10 ? 'critical' : 'high',
      message: `Low battery: ${batteryVoltage}V`,
      location: {
        coordinates
      },
      data: { batteryVoltage }
    });
    
    await alert.save();
    logger.warn(`Low battery alert created for device ${deviceId}: ${batteryVoltage}V`);
  } catch (error) {
    logger.error('Error creating low battery alert:', error);
  }
};

const getDeviceHistory = async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { startDate, endDate, limit = 100 } = req.query;
    
    const query = { deviceId };
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const history = await LocationData.find(query)
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .select('-__v');
    
    return apiResponse(res, 200, 'Device history retrieved successfully', {
      deviceId,
      count: history.length,
      data: history
    });
    
  } catch (error) {
    logger.error('Error retrieving device history:', error);
    return apiResponse(res, 500, 'Internal server error');
  }
};

module.exports = {
  updateDeviceData,
  getDeviceHistory
};
```

### Alert Controller
```javascript
// src/controllers/alertController.js
const Alert = require('../models/Alert');
const Device = require('../models/Device');
const { apiResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const createAlert = async (req, res) => {
  try {
    const { deviceId, alertType, severity, message, latitude, longitude, data } = req.body;
    
    // Update device last seen
    await Device.findOneAndUpdate(
      { deviceId },
      { lastSeen: new Date() },
      { upsert: true }
    );
    
    const alert = new Alert({
      deviceId,
      alertType,
      severity,
      message,
      location: latitude && longitude ? {
        coordinates: [longitude, latitude]
      } : undefined,
      data
    });
    
    await alert.save();
    
    logger.warn(`Alert created: ${alertType} for device ${deviceId}`);
    
    return apiResponse(res, 201, 'Alert created successfully', {
      alertId: alert._id,
      deviceId,
      alertType,
      timestamp: alert.timestamp
    });
    
  } catch (error) {
    logger.error('Error creating alert:', error);
    return apiResponse(res, 500, 'Internal server error');
  }
};

const getAlerts = async (req, res) => {
  try {
    const { 
      deviceId, 
      alertType, 
      severity, 
      isResolved, 
      startDate, 
      endDate,
      limit = 50,
      page = 1
    } = req.query;
    
    const query = {};
    
    if (deviceId) query.deviceId = deviceId;
    if (alertType) query.alertType = alertType;
    if (severity) query.severity = severity;
    if (isResolved !== undefined) query.isResolved = isResolved === 'true';
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v'),
      Alert.countDocuments(query)
    ]);
    
    return apiResponse(res, 200, 'Alerts retrieved successfully', {
      alerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    logger.error('Error retrieving alerts:', error);
    return apiResponse(res, 500, 'Internal server error');
  }
};

module.exports = {
  createAlert,
  getAlerts
};
```

## 7. Routes Configuration

### Device Routes
```javascript
// src/routes/deviceRoutes.js
const express = require('express');
const { updateDeviceData, getDeviceHistory } = require('../controllers/deviceController');
const { validateLocationData } = require('../middleware/validation');
const { deviceRateLimit } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/v1/device/update-data
router.post('/update-data', 
  deviceRateLimit,
  validateLocationData,
  updateDeviceData
);

// GET /api/v1/device/:deviceId/history
router.get('/:deviceId/history', getDeviceHistory);

module.exports = router;
```

### Alert Routes
```javascript
// src/routes/alertRoutes.js
const express = require('express');
const { createAlert, getAlerts } = require('../controllers/alertController');
const { validateAlert } = require('../middleware/validation');
const { alertRateLimit } = require('../middleware/rateLimiter');
const router = express.Router();

// POST /api/v1/alert
router.post('/', 
  alertRateLimit,
  validateAlert,
  createAlert
);

// GET /api/v1/alert
router.get('/', getAlerts);

module.exports = router;
```

## 8. Middleware

### Validation Middleware
```javascript
// src/middleware/validation.js
const { locationDataSchema, alertSchema } = require('../validators/deviceValidator');
const { apiResponse } = require('../utils/apiResponse');

const validateLocationData = (req, res, next) => {
  const { error, value } = locationDataSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return apiResponse(res, 400, 'Validation failed', { errors });
  }
  
  req.body = value;
  next();
};

const validateAlert = (req, res, next) => {
  const { error, value } = alertSchema.validate(req.body, {
    abortEarly: false,
    stripUnknown: true
  });
  
  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));
    
    return apiResponse(res, 400, 'Validation failed', { errors });
  }
  
  req.body = value;
  next();
};

module.exports = {
  validateLocationData,
  validateAlert
};
```

### Rate Limiting Middleware
```javascript
// src/middleware/rateLimiter.js
const rateLimit = require('express-rate-limit');
const slowDown = require('express-slow-down');
const RedisStore = require('rate-limit-redis');
const redis = require('redis');

let redisClient;
try {
  redisClient = redis.createClient({
    url: process.env.REDIS_URL
  });
  redisClient.connect();
} catch (error) {
  console.warn('Redis not available, using memory store for rate limiting');
}

const createRateLimiter = (windowMs, max, message) => {
  const config = {
    windowMs,
    max,
    message: {
      error: message,
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  };
  
  if (redisClient) {
    config.store = new RedisStore({
      sendCommand: (...args) => redisClient.sendCommand(args),
    });
  }
  
  return rateLimit(config);
};

// Rate limiters for different endpoints
const deviceRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  60, // 60 requests per minute per device
  'Too many location updates. Please try again later.'
);

const alertRateLimit = createRateLimiter(
  60 * 1000, // 1 minute
  10, // 10 alerts per minute per device
  'Too many alerts. Please try again later.'
);

const generalRateLimit = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // 100 requests per 15 minutes
  'Too many requests. Please try again later.'
);

// Slow down middleware for brute force protection
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 50, // allow 50 requests per 15 minutes, then...
  delayMs: 500, // begin adding 500ms of delay per request above 50
  maxDelayMs: 20000, // maximum delay of 20 seconds per request
});

module.exports = {
  deviceRateLimit,
  alertRateLimit,
  generalRateLimit,
  speedLimiter
};
```

### Error Handler Middleware
```javascript
// src/middleware/errorHandler.js
const logger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  logger.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });
  
  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(error => ({
      field: error.path,
      message: error.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors
    });
  }
  
  // Mongoose cast error
  if (err.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data format'
    });
  }
  
  // MongoDB duplicate key error
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Duplicate entry'
    });
  }
  
  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
};

module.exports = errorHandler;
```

## 9. Utility Functions

### API Response Helper
```javascript
// src/utils/apiResponse.js
const apiResponse = (res, statusCode, message, data = null, errors = null) => {
  const response = {
    success: statusCode < 400,
    message,
    timestamp: new Date().toISOString()
  };
  
  if (data) response.data = data;
  if (errors) response.errors = errors;
  
  return res.status(statusCode).json(response);
};

module.exports = { apiResponse };
```

### Logger Configuration
```javascript
// src/utils/logger.js
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'iot-tracking-server' },
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

module.exports = logger;
```

## 10. Database Configuration

```javascript
// src/config/database.js
const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      dbName: process.env.DB_NAME || 'iot_tracking',
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferMaxEntries: 0,
      bufferCommands: false,
    });
    
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });
    
    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });
    
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      logger.info('MongoDB connection closed through app termination');
      process.exit(0);
    });
    
  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;
```

## 11. Main Application File

```javascript
// src/app.js
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
require('dotenv').config();

const connectDB = require('./config/database');
const deviceRoutes = require('./routes/deviceRoutes');
const alertRoutes = require('./routes/alertRoutes');
const { generalRateLimit, speedLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./utils/logger');
const { apiResponse } = require('./utils/apiResponse');

const app = express();

// Connect to MongoDB
connectDB();

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

// General middleware
app.use(compression());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
app.use(generalRateLimit);
app.use(speedLimiter);

// API routes
const apiVersion = process.env.API_VERSION || 'v1';
app.use(`/api/${apiVersion}/device`, deviceRoutes);
app.use(`/api/${apiVersion}/alert`, alertRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use('*', (req, res) => {
  apiResponse(res, 404, 'Route not found');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

module.exports = app;
```

## 12. Docker Configuration

### Dockerfile
```dockerfile
# Use Node.js 20 Alpine for smaller image size
FROM node:20-alpine AS builder

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY src/ ./src/

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Change ownership of the app directory
RUN chown -R nodeuser:nodejs /usr/src/app
USER nodeuser

# Production stage
FROM node:20-alpine AS production

# Install dumb-init
RUN apk add --no-cache dumb-init

# Create app directory
WORKDIR /usr/src/app

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Copy built application from builder stage
COPY --from=builder --chown=nodeuser:nodejs /usr/src/app .

# Create logs directory
RUN mkdir -p logs && chown nodeuser:nodejs logs

# Switch to non-root user
USER nodeuser

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) })"

# Start the application
CMD ["dumb-init", "node", "src/app.js"]
```

### docker-compose.yml
```yaml
version: '3.8'

services:
  iot-server:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
    env_file:
      - .env
    depends_on:
      - redis
    volumes:
      - ./logs:/usr/src/app/logs
    restart: unless-stopped
    networks:
      - iot-network

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    restart: unless-stopped
    networks:
      - iot-network

volumes:
  redis_data:

networks:
  iot-network:
    driver: bridge
```

### .dockerignore
```
node_modules
npm-debug.log
.git
.gitignore
README.md
.env
.nyc_output
coverage
.env.example
Dockerfile
.dockerignore
logs/*
tests/
```

## 13. Security Best Practices Implementation

### Authentication Middleware (Optional)
```javascript
// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const { apiResponse } = require('../utils/apiResponse');

const authenticateDevice = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return apiResponse(res, 401, 'Access denied. No token provided.');
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.device = decoded;
    next();
  } catch (error) {
    return apiResponse(res, 401, 'Invalid token.');
  }
};

// Simple API key authentication (alternative)
const authenticateApiKey = (req, res, next) => {
  const apiKey = req.header('X-API-Key');
  
  if (!apiKey || apiKey !== process.env.API_KEY) {
    return apiResponse(res, 401, 'Invalid API key.');
  }
  
  next();
};

module.exports = {
  authenticateDevice,
  authenticateApiKey
};
```

## 14. ESP32 Example Integration Code

Here's example code for your ESP32 to send data to the server:

```cpp
// ESP32 Arduino code example
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

const char* serverURL = "https://your-server.com/api/v1/device/update-data";
const char* alertURL = "https://your-server.com/api/v1/alert";
const char* apiKey = "your-api-key";

void sendLocationData(float lat, float lng, float batteryVoltage) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(serverURL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    
    DynamicJsonDocument doc(1024);
    doc["deviceId"] = "ESP32_001";
    doc["latitude"] = lat;
    doc["longitude"] = lng;
    doc["batteryVoltage"] = batteryVoltage;
    doc["signalStrength"] = WiFi.RSSI();
    
    // Add digital inputs
    JsonObject digitalInputs = doc.createNestedObject("digitalInputs");
    digitalInputs["pin2"] = digitalRead(2);
    digitalInputs["pin4"] = digitalRead(4);
    
    // Add analog inputs
    JsonObject analogInputs = doc.createNestedObject("analogInputs");
    analogInputs["A0"] = analogRead(A0);
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode > 0) {
      Serial.println("Data sent successfully");
    } else {
      Serial.println("Error sending data");
    }
    
    http.end();
  }
}

void sendAlert(String alertType, String message) {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    http.begin(alertURL);
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-API-Key", apiKey);
    
    DynamicJsonDocument doc(512);
    doc["deviceId"] = "ESP32_001";
    doc["alertType"] = alertType;
    doc["severity"] = "high";
    doc["message"] = message;
    
    String jsonString;
    serializeJson(doc, jsonString);
    
    int httpResponseCode = http.POST(jsonString);
    if (httpResponseCode > 0) {
      Serial.println("Alert sent successfully");
    } else {
      Serial.println("Error sending alert");
    }
    
    http.end();
  }
}
```

## 15. Deployment Instructions

### For Coolify Deployment:

1. **Push code to Git repository**
2. **Create new project in Coolify**
3. **Set environment variables**
4. **Configure build settings:**
   - Build command: `npm ci --only=production`
   - Start command: `node src/app.js`
   - Port: `3000`

### Environment Variables for Production:
```env
NODE_ENV=production
PORT=3000
MONGODB_URI=your_mongodb_atlas_connection_string
REDIS_URL=redis://redis:6379
JWT_SECRET=your_super_secure_jwt_secret_at_least_32_characters
API_KEY=your_api_key_for_device_authentication
LOG_LEVEL=info
ALLOWED_ORIGINS=https://your-frontend-domain.com
```

## 16. Monitoring and Maintenance

### Health Monitoring
- Implement health check endpoint (`/health`)
- Monitor MongoDB connection status
- Track Redis connection for rate limiting
- Log important metrics (requests/min, errors, response times)

### Scaling Considerations
- Use Redis for rate limiting to support multiple server instances
- Implement horizontal scaling with load balancers
- Consider MongoDB sharding for very high data volumes
- Use time series collections for optimal performance

### Backup Strategy
- Regular MongoDB Atlas automated backups
- Monitor disk space for logs
- Implement log rotation

This comprehensive plan provides everything needed to build a production-ready IoT tracking server with Node.js, MongoDB Atlas, and Docker. The architecture is scalable, secure, and follows industry best practices for IoT applications.
