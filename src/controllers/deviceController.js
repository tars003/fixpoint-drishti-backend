const LocationData = require('../models/LocationData');
const Device = require('../models/Device');
const Alert = require('../models/Alert');
const { 
  successResponse, 
  createdResponse, 
  notFoundResponse, 
  serverErrorResponse 
} = require('../utils/apiResponse');
const logger = require('../utils/logger');
const { asyncHandler, notFoundError, AppError } = require('../middleware/errorHandler');

/**
 * Update device location data
 * @route POST /api/v1/device/update-data
 * @access Private (API Key required)
 */
const updateDeviceData = asyncHandler(async (req, res) => {
  const { 
    deviceId, 
    latitude, 
    longitude, 
    batteryVoltage, 
    altitude,
    speed,
    course,
    accuracy,
    satellites,
    batteryPercentage,
    digitalInputs,
    analogInputs,
    signalStrength,
    temperature,
    humidity,
    timestamp
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
    
    // Create location data entry
    const locationData = new LocationData({
      deviceId,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude] // GeoJSON format: [lng, lat]
      },
      altitude,
      speed,
      course,
      accuracy,
      satellites,
      batteryVoltage,
      batteryPercentage,
      digitalInputs: digitalInputs ? new Map(Object.entries(digitalInputs)) : undefined,
      analogInputs: analogInputs ? new Map(Object.entries(analogInputs)) : undefined,
      signalStrength,
      temperature,
      humidity,
      timestamp: timestamp ? new Date(timestamp) : new Date()
    });
    
    await locationData.save();
    
    // Check for alerts
    const alertsCreated = await checkAndCreateAlerts(device, locationData);
    
    logger.info('Location data updated successfully', {
      deviceId,
      coordinates: [latitude, longitude],
      batteryVoltage,
      alertsCreated: alertsCreated.length,
      timestamp: locationData.timestamp
    });
    
    return successResponse(res, 'Location data updated successfully', {
      deviceId,
      timestamp: locationData.timestamp,
      batteryStatus: locationData.batteryStatus,
      alertsCreated: alertsCreated.length,
      location: {
        latitude,
        longitude
      }
    });
    
  } catch (error) {
    logger.error('Error updating device data:', {
      error: error.message,
      stack: error.stack,
      deviceId,
      coordinates: [latitude, longitude]
    });
    
    if (error.name === 'ValidationError') {
      throw new AppError('Invalid location data', 400, Object.values(error.errors).map(e => ({
        field: e.path,
        message: e.message
      })));
    }
    
    throw error;
  }
});

/**
 * Get device location history
 * @route GET /api/v1/device/:deviceId/history
 * @access Private (API Key required)
 */
const getDeviceHistory = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  const { startDate, endDate, limit = 100, page = 1 } = req.query;
  
  try {
    // Verify device exists
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw notFoundError('Device');
    }
    
    // Build query
    const query = { deviceId };
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }
    
    // Calculate pagination
    const skip = (page - 1) * limit;
    
    // Get history data with pagination
    const [history, total] = await Promise.all([
      LocationData.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .select('-__v')
        .lean(),
      LocationData.countDocuments(query)
    ]);
    
    // Format response data
    const formattedHistory = history.map(item => ({
      ...item,
      coordinates: {
        latitude: item.location.coordinates[1],
        longitude: item.location.coordinates[0]
      },
      digitalInputs: item.digitalInputs ? Object.fromEntries(item.digitalInputs) : {},
      analogInputs: item.analogInputs ? Object.fromEntries(item.analogInputs) : {}
    }));
    
    logger.info('Device history retrieved', {
      deviceId,
      count: history.length,
      total,
      dateRange: { startDate, endDate },
      pagination: { page, limit }
    });
    
    return successResponse(res, 'Device history retrieved successfully', {
      deviceId,
      device: {
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen,
        isActive: device.isActive
      },
      history: formattedHistory,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      },
      dateRange: {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      }
    });
    
  } catch (error) {
    logger.error('Error retrieving device history:', {
      error: error.message,
      deviceId,
      query: req.query
    });
    throw error;
  }
});

/**
 * Get device current location
 * @route GET /api/v1/device/:deviceId/current
 * @access Private (API Key required)
 */
const getCurrentLocation = asyncHandler(async (req, res) => {
  const { deviceId } = req.params;
  
  try {
    // Get device info
    const device = await Device.findOne({ deviceId });
    if (!device) {
      throw notFoundError('Device');
    }
    
    // Get latest location data
    const currentLocation = await LocationData.findOne({ deviceId })
      .sort({ timestamp: -1 })
      .select('-__v')
      .lean();
    
    if (!currentLocation) {
      return successResponse(res, 'No location data found for device', {
        deviceId,
        device: {
          name: device.name,
          status: device.status,
          lastSeen: device.lastSeen,
          isActive: device.isActive
        },
        location: null
      });
    }
    
    // Format location data
    const formattedLocation = {
      ...currentLocation,
      coordinates: {
        latitude: currentLocation.location.coordinates[1],
        longitude: currentLocation.location.coordinates[0]
      },
      digitalInputs: currentLocation.digitalInputs ? Object.fromEntries(currentLocation.digitalInputs) : {},
      analogInputs: currentLocation.analogInputs ? Object.fromEntries(currentLocation.analogInputs) : {}
    };
    
    logger.info('Current location retrieved', {
      deviceId,
      timestamp: currentLocation.timestamp,
      coordinates: formattedLocation.coordinates
    });
    
    return successResponse(res, 'Current location retrieved successfully', {
      deviceId,
      device: {
        name: device.name,
        status: device.status,
        lastSeen: device.lastSeen,
        isActive: device.isActive
      },
      location: formattedLocation
    });
    
  } catch (error) {
    logger.error('Error retrieving current location:', {
      error: error.message,
      deviceId
    });
    throw error;
  }
});

/**
 * Register or update device
 * @route POST /api/v1/device/register
 * @access Private (API Key required)
 */
const registerDevice = asyncHandler(async (req, res) => {
  const { deviceId, name, description, batteryThreshold, alertSettings, hardware } = req.body;
  
  try {
    const device = await Device.findOneAndUpdate(
      { deviceId },
      {
        name,
        description,
        batteryThreshold,
        alertSettings,
        hardware,
        lastSeen: new Date(),
        isActive: true
      },
      {
        upsert: true,
        new: true,
        runValidators: true
      }
    );
    
    const isNewDevice = !device.createdAt || device.createdAt === device.updatedAt;
    
    logger.info(`Device ${isNewDevice ? 'registered' : 'updated'}`, {
      deviceId,
      name,
      isNew: isNewDevice
    });
    
    return createdResponse(res, `Device ${isNewDevice ? 'registered' : 'updated'} successfully`, {
      deviceId: device.deviceId,
      name: device.name,
      status: device.status,
      isNew: isNewDevice,
      lastSeen: device.lastSeen
    });
    
  } catch (error) {
    logger.error('Error registering device:', {
      error: error.message,
      deviceId,
      name
    });
    
    if (error.code === 11000) {
      throw new AppError('Device ID already exists', 409);
    }
    
    throw error;
  }
});

/**
 * Get all devices
 * @route GET /api/v1/device/list
 * @access Private (API Key required)
 */
const getAllDevices = asyncHandler(async (req, res) => {
  const { isActive, status, limit = 50, page = 1 } = req.query;
  
  try {
    const query = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }
    
    const skip = (page - 1) * limit;
    
    let devices = await Device.find(query)
      .sort({ lastSeen: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('-__v')
      .lean();
    
    // Filter by computed status if requested
    if (status) {
      devices = devices.filter(device => {
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const deviceStatus = !device.isActive ? 'inactive' : 
                           device.lastSeen > fiveMinutesAgo ? 'online' : 'offline';
        return deviceStatus === status;
      });
    }
    
    const total = await Device.countDocuments(query);
    
    // Get latest location for each device
    const devicesWithLocation = await Promise.all(
      devices.map(async (device) => {
        const latestLocation = await LocationData.findOne({ deviceId: device.deviceId })
          .sort({ timestamp: -1 })
          .select('location batteryVoltage timestamp')
          .lean();
        
        return {
          ...device,
          status: !device.isActive ? 'inactive' : 
                  device.lastSeen > new Date(Date.now() - 5 * 60 * 1000) ? 'online' : 'offline',
          latestLocation: latestLocation ? {
            coordinates: {
              latitude: latestLocation.location.coordinates[1],
              longitude: latestLocation.location.coordinates[0]
            },
            batteryVoltage: latestLocation.batteryVoltage,
            timestamp: latestLocation.timestamp
          } : null
        };
      })
    );
    
    logger.info('Device list retrieved', {
      count: devices.length,
      total,
      filters: { isActive, status }
    });
    
    return successResponse(res, 'Devices retrieved successfully', {
      devices: devicesWithLocation,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });
    
  } catch (error) {
    logger.error('Error retrieving devices:', {
      error: error.message,
      query: req.query
    });
    throw error;
  }
});

/**
 * Check and create alerts based on device data
 * @param {Object} device - Device document
 * @param {Object} locationData - Location data document
 * @returns {Array} Created alerts
 */
const checkAndCreateAlerts = async (device, locationData) => {
  const alerts = [];
  
  try {
    // Low battery alert
    if (device.alertSettings.lowBatteryEnabled && 
        locationData.batteryVoltage < (device.batteryThreshold || 20)) {
      
      // Check if we already have a recent low battery alert
      const recentAlert = await Alert.findOne({
        deviceId: device.deviceId,
        alertType: 'low_battery',
        isResolved: false,
        timestamp: { $gte: new Date(Date.now() - 30 * 60 * 1000) } // 30 minutes
      });
      
      if (!recentAlert) {
        const alert = new Alert({
          deviceId: device.deviceId,
          alertType: 'low_battery',
          severity: locationData.batteryVoltage < 10 ? 'critical' : 'high',
          title: 'Low Battery Warning',
          message: `Battery voltage is low: ${locationData.batteryVoltage}V (${locationData.batteryPercentage || 'N/A'}%)`,
          location: locationData.location,
          data: { 
            batteryVoltage: locationData.batteryVoltage,
            batteryPercentage: locationData.batteryPercentage,
            threshold: device.batteryThreshold
          }
        });
        
        await alert.save();
        alerts.push(alert);
        
        logger.warn('Low battery alert created', {
          deviceId: device.deviceId,
          batteryVoltage: locationData.batteryVoltage,
          batteryPercentage: locationData.batteryPercentage,
          threshold: device.batteryThreshold
        });
      }
    }
    
    // Temperature alert (if enabled and temperature data available)
    if (locationData.temperature !== undefined) {
      const tempThresholds = {
        low: -10, // Below -10°C
        high: 60  // Above 60°C
      };
      
      if (locationData.temperature < tempThresholds.low || locationData.temperature > tempThresholds.high) {
        const recentTempAlert = await Alert.findOne({
          deviceId: device.deviceId,
          alertType: 'temperature',
          isResolved: false,
          timestamp: { $gte: new Date(Date.now() - 15 * 60 * 1000) } // 15 minutes
        });
        
        if (!recentTempAlert) {
          const isHigh = locationData.temperature > tempThresholds.high;
          const alert = new Alert({
            deviceId: device.deviceId,
            alertType: 'temperature',
            severity: Math.abs(locationData.temperature - (isHigh ? tempThresholds.high : tempThresholds.low)) > 20 ? 'critical' : 'high',
            title: `${isHigh ? 'High' : 'Low'} Temperature Alert`,
            message: `Temperature is ${isHigh ? 'above' : 'below'} safe limits: ${locationData.temperature}°C`,
            location: locationData.location,
            data: { 
              temperature: locationData.temperature,
              threshold: isHigh ? tempThresholds.high : tempThresholds.low,
              type: isHigh ? 'high' : 'low'
            }
          });
          
          await alert.save();
          alerts.push(alert);
          
          logger.warn('Temperature alert created', {
            deviceId: device.deviceId,
            temperature: locationData.temperature,
            type: isHigh ? 'high' : 'low'
          });
        }
      }
    }
    
    // TODO: Add geofence alerts when geofence is implemented
    // TODO: Add tampering detection based on accelerometer data
    
  } catch (error) {
    logger.error('Error checking alerts:', {
      error: error.message,
      deviceId: device.deviceId
    });
  }
  
  return alerts;
};

module.exports = {
  updateDeviceData,
  getDeviceHistory,
  getCurrentLocation,
  registerDevice,
  getAllDevices
};