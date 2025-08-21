const express = require('express');
const router = express.Router();

// Controllers
const { 
  createAlert, 
  getAlerts,
  getAlertById,
  resolveAlert,
  acknowledgeAlert,
  getAlertStats,
  deleteAlert
} = require('../controllers/alertController');

// Middleware
const { 
  validateAlert,
  validateAlertsQuery,
  validatePagination,
  validateDateRange,
  sanitizeStrings,
  validateContentType
} = require('../middleware/validation');

const { 
  alertRateLimit, 
  generalRateLimit,
  strictRateLimit,
  rateLimitLogger 
} = require('../middleware/rateLimiter');

const { 
  authenticateApiKey,
  validateDeviceAccess,
  securityHeaders,
  requireRoles
} = require('../middleware/auth');

const { 
  decodeJwtPayload 
} = require('../middleware/jwtPayload');

// Apply common middleware to all routes
router.use(securityHeaders);
router.use(rateLimitLogger);
router.use(sanitizeStrings);

/**
 * @route   POST /api/v1/alert
 * @desc    Create a new alert
 * @access  Private (API Key required)
 * @body    JWT token containing: { deviceId, alertType, severity, title, message, latitude, longitude, data }
 */
router.post('/', 
  alertRateLimit,
  validateContentType,
  authenticateApiKey,
  decodeJwtPayload,
  validateAlert,
  validateDeviceAccess,
  createAlert
);

/**
 * @route   GET /api/v1/alert
 * @desc    Get alerts with filtering and pagination
 * @access  Private (API Key required)
 * @query   ?deviceId=DEV001&alertType=low_battery&severity=high&isResolved=false&startDate=2024-01-01&endDate=2024-01-31&limit=50&page=1
 */
router.get('/',
  generalRateLimit,
  authenticateApiKey,
  validateAlertsQuery,
  validateDateRange,
  validatePagination,
  getAlerts
);

/**
 * @route   GET /api/v1/alert/stats
 * @desc    Get alert statistics and analytics
 * @access  Private (API Key required)
 * @query   ?deviceId=DEV001&startDate=2024-01-01&endDate=2024-01-31
 */
router.get('/stats',
  generalRateLimit,
  authenticateApiKey,
  validateDateRange,
  getAlertStats
);

/**
 * @route   GET /api/v1/alert/:alertId
 * @desc    Get alert by ID
 * @access  Private (API Key required)
 * @params  alertId
 */
router.get('/:alertId',
  generalRateLimit,
  authenticateApiKey,
  getAlertById
);

/**
 * @route   PUT /api/v1/alert/:alertId/resolve
 * @desc    Resolve an alert
 * @access  Private (API Key required)
 * @params  alertId
 * @body    { resolvedBy?, resolutionNotes? }
 */
router.put('/:alertId/resolve',
  strictRateLimit,
  validateContentType,
  authenticateApiKey,
  resolveAlert
);

/**
 * @route   PUT /api/v1/alert/:alertId/acknowledge
 * @desc    Acknowledge an alert
 * @access  Private (API Key required)
 * @params  alertId
 * @body    { acknowledgedBy? }
 */
router.put('/:alertId/acknowledge',
  strictRateLimit,
  validateContentType,
  authenticateApiKey,
  acknowledgeAlert
);

/**
 * @route   DELETE /api/v1/alert/:alertId
 * @desc    Delete an alert (admin only)
 * @access  Private (Master API Key required)
 * @params  alertId
 */
router.delete('/:alertId',
  strictRateLimit,
  authenticateApiKey,
  // Only allow master API key to delete alerts
  (req, res, next) => {
    if (req.apiKey?.type !== 'master') {
      return res.status(403).json({
        success: false,
        message: 'Master API key required for this operation',
        timestamp: new Date().toISOString()
      });
    }
    next();
  },
  deleteAlert
);

module.exports = router;