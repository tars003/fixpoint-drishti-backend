const express = require('express');
const router = express.Router();

// Controllers
const { 
  updateDeviceData, 
  getDeviceHistory, 
  getCurrentLocation,
  registerDevice,
  getAllDevices
} = require('../controllers/deviceController');

// Middleware
const { 
  validateLocationData,
  validateDevice,
  validateDeviceId,
  validateDeviceHistoryQuery,
  validatePagination,
  validateDateRange,
  sanitizeStrings,
  validateContentType
} = require('../middleware/validation');

const { 
  deviceRateLimit, 
  generalRateLimit,
  rateLimitLogger 
} = require('../middleware/rateLimiter');

const { 
  authenticateApiKey,
  validateDeviceAccess,
  securityHeaders
} = require('../middleware/auth');

const { 
  decodeJwtPayload 
} = require('../middleware/jwtPayload');

// Apply common middleware to all routes
router.use(securityHeaders);
router.use(rateLimitLogger);
router.use(sanitizeStrings);

/**
 * @route   POST /api/v1/device/update-data
 * @desc    Update device location and sensor data
 * @access  Private (API Key required)
 * @body    JWT token containing: { deviceId, latitude, longitude, batteryVoltage, ... }
 */
router.post('/update-data', 
  deviceRateLimit,
  validateContentType,
  authenticateApiKey,
  decodeJwtPayload,
  validateLocationData,
  validateDeviceAccess,
  updateDeviceData
);

/**
 * @route   POST /api/v1/device/register
 * @desc    Register or update a device
 * @access  Private (API Key required)
 * @body    { deviceId, name, description, batteryThreshold, alertSettings, hardware }
 */
router.post('/register',
  generalRateLimit,
  validateContentType,
  authenticateApiKey,
  validateDevice,
  validateDeviceAccess,
  registerDevice
);

/**
 * @route   GET /api/v1/device/list
 * @desc    Get all devices with optional filtering
 * @access  Private (API Key required)
 * @query   ?isActive=true&status=online&limit=50&page=1
 */
router.get('/list',
  generalRateLimit,
  authenticateApiKey,
  validatePagination,
  getAllDevices
);

/**
 * @route   GET /api/v1/device/:deviceId/history
 * @desc    Get device location history
 * @access  Private (API Key required)
 * @params  deviceId
 * @query   ?startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1
 */
router.get('/:deviceId/history',
  generalRateLimit,
  authenticateApiKey,
  validateDeviceId,
  validateDeviceHistoryQuery,
  validateDateRange,
  validatePagination,
  validateDeviceAccess,
  getDeviceHistory
);

/**
 * @route   GET /api/v1/device/:deviceId/current
 * @desc    Get device current/latest location
 * @access  Private (API Key required)
 * @params  deviceId
 */
router.get('/:deviceId/current',
  generalRateLimit,
  authenticateApiKey,
  validateDeviceId,
  validateDeviceAccess,
  getCurrentLocation
);

/**
 * @route   GET /api/v1/device/:deviceId
 * @desc    Get device details (alias for current location with device info)
 * @access  Private (API Key required)
 * @params  deviceId
 */
router.get('/:deviceId',
  generalRateLimit,
  authenticateApiKey,
  validateDeviceId,
  validateDeviceAccess,
  getCurrentLocation
);

module.exports = router;