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
  authenticateApiKey,
  authenticateToken,
  validateDeviceAccess,
  securityHeaders
} = require('../middleware/auth');

const { 
  decodeJwtPayload 
} = require('../middleware/jwtPayload');

// Apply common middleware to all routes
router.use(securityHeaders);
router.use(sanitizeStrings);

/**
 * @route   POST /api/v1/device/update-data
 * @desc    Update device location and sensor data
 * @access  Private (API Key required)
 * @body    JWT token containing: { deviceId, latitude, longitude, batteryVoltage, ... }
 */
router.post('/update-data', 
  validateContentType,
  authenticateApiKey,
  decodeJwtPayload,
  // validateLocationData, // REMOVED: Latitude/longitude validation
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
  authenticateApiKey,
  validatePagination,
  getAllDevices
);

/**
 * @route   GET /api/v1/device/web-list
 * @desc    Get all devices for web interface (no user filtering for now)
 * @access  Private (JWT required)
 * @query   ?isActive=true&status=online&limit=50&page=1
 */
router.get('/web-list',
  authenticateToken,
  validatePagination,
  getAllDevices
);

/**
 * @route   GET /api/v1/device/:deviceId/web-history
 * @desc    Get device history for web interface (JWT auth)
 * @access  Private (JWT required)
 * @params  deviceId
 * @query   ?startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1
 */
router.get('/:deviceId/web-history',
  authenticateToken,
  validateDeviceId,
  validateDeviceHistoryQuery,
  validateDateRange,
  validatePagination,
  getDeviceHistory
);

/**
 * @route   GET /api/v1/device/:deviceId/web-current
 * @desc    Get device current location for web interface (JWT auth)
 * @access  Private (JWT required)
 * @params  deviceId
 */
router.get('/:deviceId/web-current',
  authenticateToken,
  validateDeviceId,
  getCurrentLocation
);

/**
 * @route   GET /api/v1/device/:deviceId/history
 * @desc    Get device location history
 * @access  Private (API Key required)
 * @params  deviceId
 * @query   ?startDate=2024-01-01&endDate=2024-01-31&limit=100&page=1
 */
router.get('/:deviceId/history',
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
  authenticateApiKey,
  validateDeviceId,
  validateDeviceAccess,
  getCurrentLocation
);

module.exports = router;