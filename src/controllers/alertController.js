const Alert = require('../models/Alert');
const Device = require('../models/Device');
const { 
  successResponse, 
  createdResponse, 
  notFoundResponse 
} = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { asyncHandler, notFoundError, AppError } = require('../middleware/errorHandler');

/**
 * Create a new alert
 * @route POST /api/v1/alert
 * @access Private (API Key required)
 */
const createAlert = asyncHandler(async (req, res) => {
  const { 
    deviceId, 
    alertType, 
    severity, 
    title,
    message, 
    latitude, 
    longitude, 
    data 
  } = req.body;
  
  try {
    // Update device last seen and ensure device exists
    const device = await Device.findOneAndUpdate(
      { deviceId },
      { 
        lastSeen: new Date(),
        $setOnInsert: {
          name: deviceId, // Default name to deviceId if creating new
          isActive: true
        }
      },
      { 
        upsert: true, 
        new: true,
        runValidators: true 
      }
    );
    
    // Create alert
    const alert = new Alert({
      deviceId,
      alertType,
      severity: severity || 'medium',
      title,
      message,
      location: latitude && longitude ? {
        type: 'Point',
        coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
      } : undefined,
      data: data || {}
    });
    
    await alert.save();
    
    logger.warn('Alert created', {
      alertId: alert._id,
      deviceId,
      alertType,
      severity: alert.severity,
      message,
      location: latitude && longitude ? { latitude, longitude } : null
    });
    
    return createdResponse(res, 'Alert created successfully', {
      alertId: alert._id,
      deviceId,
      alertType,
      severity: alert.severity,
      title: alert.title,
      message,
      timestamp: alert.timestamp,
      isResolved: alert.isResolved,
      location: latitude && longitude ? { latitude, longitude } : null
    });
    
  } catch (error) {
    logger.error('Error creating alert:', {
      error: error.message,
      stack: error.stack,
      deviceId,
      alertType,
      message
    });
    
    if (error.name === 'ValidationError') {
      throw new AppError('Invalid alert data', 400, Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      })));
    }
    
    throw error;
  }
});

/**
 * Get alerts with filtering and pagination
 * @route GET /api/v1/alert
 * @access Private (API Key required)
 */
const getAlerts = asyncHandler(async (req, res) => {
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
  
  try {
    // Build query - exclude soft-deleted alerts by default
    const query = { deletedAt: null };
    
    if (deviceId) query.deviceId = deviceId;
    if (alertType) query.alertType = alertType;
    if (severity) query.severity = severity;
    if (isResolved !== undefined) query.isResolved = isResolved === 'true';
    
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Get alerts with pagination
    const [alerts, total] = await Promise.all([
      Alert.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      Alert.countDocuments(query)
    ]);
    
    // Format alerts for response
    const formattedAlerts = alerts.map(alert => ({
      ...alert,
      coordinates: alert.location?.coordinates ? {
        latitude: alert.location.coordinates[1],
        longitude: alert.location.coordinates[0]
      } : null,
      ageInMinutes: Math.floor((Date.now() - alert.timestamp.getTime()) / (1000 * 60)),
      status: alert.isResolved ? 'resolved' : 
              alert.acknowledgedAt ? 'acknowledged' : 'open'
    }));
    
    logger.info('Alerts retrieved', {
      count: alerts.length,
      total,
      filters: { deviceId, alertType, severity, isResolved },
      pagination: { page, limit }
    });
    
    return successResponse(res, 'Alerts retrieved successfully', {
      alerts: formattedAlerts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit)),
        hasNext: page < Math.ceil(total / parseInt(limit)),
        hasPrev: page > 1
      },
      filters: {
        deviceId,
        alertType,
        severity,
        isResolved: isResolved !== undefined ? isResolved === 'true' : undefined,
        dateRange: {
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null
        }
      }
    });
    
  } catch (error) {
    logger.error('Error retrieving alerts:', {
      error: error.message,
      query: req.query
    });
    throw error;
  }
});

/**
 * Get alert by ID
 * @route GET /api/v1/alert/:alertId
 * @access Private (API Key required)
 */
const getAlertById = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  
  try {
    const alert = await Alert.findById(alertId).select('-__v').lean();
    
    if (!alert || alert.deletedAt) {
      throw notFoundError('Alert');
    }
    
    // Format alert for response
    const formattedAlert = {
      ...alert,
      coordinates: alert.location?.coordinates ? {
        latitude: alert.location.coordinates[1],
        longitude: alert.location.coordinates[0]
      } : null,
      ageInMinutes: Math.floor((Date.now() - alert.timestamp.getTime()) / (1000 * 60)),
      resolutionTimeMinutes: alert.isResolved && alert.resolvedAt ? 
        Math.floor((alert.resolvedAt.getTime() - alert.timestamp.getTime()) / (1000 * 60)) : null,
      status: alert.isResolved ? 'resolved' : 
              alert.acknowledgedAt ? 'acknowledged' : 'open'
    };
    
    logger.info('Alert retrieved by ID', {
      alertId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      status: formattedAlert.status
    });
    
    return successResponse(res, 'Alert retrieved successfully', {
      alert: formattedAlert
    });
    
  } catch (error) {
    logger.error('Error retrieving alert by ID:', {
      error: error.message,
      alertId
    });
    throw error;
  }
});

/**
 * Resolve an alert
 * @route PUT /api/v1/alert/:alertId/resolve
 * @access Private (API Key required)
 */
const resolveAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { resolvedBy, resolutionNotes } = req.body;
  
  try {
    const alert = await Alert.findById(alertId);
    
    if (!alert || alert.deletedAt) {
      throw notFoundError('Alert');
    }
    
    if (alert.isResolved) {
      throw new AppError('Alert is already resolved', 400);
    }
    
    // Resolve the alert
    alert.isResolved = true;
    alert.resolvedAt = new Date();
    if (resolvedBy) alert.resolvedBy = resolvedBy;
    if (resolutionNotes) alert.resolutionNotes = resolutionNotes;
    
    await alert.save();
    
    const resolutionTimeMinutes = Math.floor(
      (alert.resolvedAt.getTime() - alert.timestamp.getTime()) / (1000 * 60)
    );
    
    logger.info('Alert resolved', {
      alertId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      resolvedBy,
      resolutionTimeMinutes
    });
    
    return successResponse(res, 'Alert resolved successfully', {
      alertId,
      deviceId: alert.deviceId,
      resolvedAt: alert.resolvedAt,
      resolvedBy: alert.resolvedBy,
      resolutionTimeMinutes,
      resolutionNotes: alert.resolutionNotes
    });
    
  } catch (error) {
    logger.error('Error resolving alert:', {
      error: error.message,
      alertId
    });
    throw error;
  }
});

/**
 * Acknowledge an alert
 * @route PUT /api/v1/alert/:alertId/acknowledge
 * @access Private (API Key required)
 */
const acknowledgeAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  const { acknowledgedBy } = req.body;
  
  try {
    const alert = await Alert.findById(alertId);
    
    if (!alert || alert.deletedAt) {
      throw notFoundError('Alert');
    }
    
    if (alert.isResolved) {
      throw new AppError('Cannot acknowledge a resolved alert', 400);
    }
    
    if (alert.acknowledgedAt) {
      throw new AppError('Alert is already acknowledged', 400);
    }
    
    // Acknowledge the alert
    alert.acknowledgedAt = new Date();
    if (acknowledgedBy) alert.acknowledgedBy = acknowledgedBy;
    
    await alert.save();
    
    logger.info('Alert acknowledged', {
      alertId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      acknowledgedBy
    });
    
    return successResponse(res, 'Alert acknowledged successfully', {
      alertId,
      deviceId: alert.deviceId,
      acknowledgedAt: alert.acknowledgedAt,
      acknowledgedBy: alert.acknowledgedBy
    });
    
  } catch (error) {
    logger.error('Error acknowledging alert:', {
      error: error.message,
      alertId
    });
    throw error;
  }
});

/**
 * Get alert statistics
 * @route GET /api/v1/alert/stats
 * @access Private (API Key required)
 */
const getAlertStats = asyncHandler(async (req, res) => {
  const { deviceId, startDate, endDate } = req.query;
  
  try {
    // Build match query for aggregation - exclude soft-deleted alerts
    const match = { deletedAt: null };
    if (deviceId) match.deviceId = deviceId;
    if (startDate || endDate) {
      match.timestamp = {};
      if (startDate) match.timestamp.$gte = new Date(startDate);
      if (endDate) match.timestamp.$lte = new Date(endDate);
    }
    
    // Get comprehensive statistics
    const [stats] = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
          acknowledged: { $sum: { $cond: ['$acknowledgedAt', 1, 0] } },
          open: { $sum: { $cond: [{ $and: [{ $not: '$isResolved' }, { $not: '$acknowledgedAt' }] }, 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } },
          high: { $sum: { $cond: [{ $eq: ['$severity', 'high'] }, 1, 0] } },
          medium: { $sum: { $cond: [{ $eq: ['$severity', 'medium'] }, 1, 0] } },
          low: { $sum: { $cond: [{ $eq: ['$severity', 'low'] }, 1, 0] } },
          avgResolutionTime: {
            $avg: {
              $cond: [
                '$isResolved',
                { $subtract: ['$resolvedAt', '$timestamp'] },
                null
              ]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          resolved: 1,
          acknowledged: 1,
          open: 1,
          unresolved: { $subtract: ['$total', '$resolved'] },
          severity: {
            critical: '$critical',
            high: '$high',
            medium: '$medium',
            low: '$low'
          },
          avgResolutionTimeMinutes: {
            $cond: [
              '$avgResolutionTime',
              { $divide: ['$avgResolutionTime', 1000 * 60] },
              null
            ]
          }
        }
      }
    ]);
    
    // Get alert type breakdown
    const alertTypeStats = await Alert.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$alertType',
          count: { $sum: 1 },
          resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    // Get recent trend (last 24 hours by hour)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const trendData = await Alert.aggregate([
      { 
        $match: { 
          ...match,
          timestamp: { $gte: twentyFourHoursAgo }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            date: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } }
          },
          count: { $sum: 1 },
          critical: { $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] } }
        }
      },
      { $sort: { '_id.date': 1, '_id.hour': 1 } }
    ]);
    
    const defaultStats = {
      total: 0,
      resolved: 0,
      acknowledged: 0,
      open: 0,
      unresolved: 0,
      severity: { critical: 0, high: 0, medium: 0, low: 0 },
      avgResolutionTimeMinutes: null
    };
    
    logger.info('Alert statistics retrieved', {
      deviceId: deviceId || 'all',
      dateRange: { startDate, endDate },
      total: stats?.total || 0
    });
    
    return successResponse(res, 'Alert statistics retrieved successfully', {
      statistics: stats || defaultStats,
      alertTypes: alertTypeStats,
      trend: trendData,
      dateRange: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      },
      generatedAt: new Date()
    });
    
  } catch (error) {
    logger.error('Error retrieving alert statistics:', {
      error: error.message,
      query: req.query
    });
    throw error;
  }
});

/**
 * Delete an alert (admin only)
 * @route DELETE /api/v1/alert/:alertId
 * @access Private (Master API Key required)
 */
const deleteAlert = asyncHandler(async (req, res) => {
  const { alertId } = req.params;
  
  try {
    const alert = await Alert.findById(alertId);
    
    if (!alert || alert.deletedAt) {
      throw notFoundError('Alert');
    }
    
    // SOFT DELETE - preserve data integrity
    alert.deletedAt = new Date();
    alert.deletedBy = req.apiKey?.type || 'unknown';
    await alert.save();
    
    logger.warn('Alert soft deleted (archived)', {
      alertId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      deletedBy: alert.deletedBy,
      deletedAt: alert.deletedAt
    });
    
    return successResponse(res, 'Alert archived successfully - data preserved', {
      alertId,
      deviceId: alert.deviceId,
      alertType: alert.alertType,
      archivedAt: alert.deletedAt,
      archivedBy: alert.deletedBy
    });
    
  } catch (error) {
    logger.error('Error archiving alert:', {
      error: error.message,
      alertId
    });
    throw error;
  }
});

// Helper function for creating hardware error alerts with appropriate severity mapping
const createHardwareErrorAlert = async (deviceId, errorType, errorData = {}, customMessage = null) => {
  const severityMap = {
    'watchdog_triggered': 'critical',    // System restart - critical
    'obd2_malfunction': 'critical',      // Can't read vehicle data - critical
    'gps_malfunction': 'high',           // Location tracking lost - high priority
    'gyroscope_malfunction': 'high'      // Motion detection compromised - high priority
  };
  
  const severity = severityMap[errorType] || 'medium';
  const message = customMessage || `Hardware error detected: ${errorType.replace(/_/g, ' ')}`;
  
  return {
    deviceId,
    alertType: errorType,
    severity,
    message,
    data: {
      errorType,
      timestamp: new Date().toISOString(),
      ...errorData
    }
  };
};

module.exports = {
  createAlert,
  getAlerts,
  getAlertById,
  resolveAlert,
  acknowledgeAlert,
  getAlertStats,
  deleteAlert,
  createHardwareErrorAlert  // Export the helper for IoT devices to use
};