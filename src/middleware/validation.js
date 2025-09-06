const { 
  locationDataSchema, 
  alertSchema, 
  deviceSchema,
  deviceHistoryQuerySchema,
  alertsQuerySchema 
} = require('../validators/deviceValidator');
const { badRequestResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Generic validation middleware factory
 * @param {Object} schema - Joi validation schema
 * @param {string} source - Source of data to validate ('body', 'query', 'params')
 * @param {Object} options - Joi validation options
 * @returns {Function} Express middleware
 */
const createValidationMiddleware = (schema, source = 'body', options = {}) => {
  const defaultOptions = {
    abortEarly: false, // Return all validation errors
    stripUnknown: true, // Remove unknown properties
    allowUnknown: false, // Don't allow unknown properties
    ...options
  };

  return (req, res, next) => {
    const dataToValidate = req[source];
    
    if (!dataToValidate) {
      logger.warn('No data to validate', { source, url: req.url, method: req.method });
      return badRequestResponse(res, `No ${source} data provided`);
    }

    const { error, value } = schema.validate(dataToValidate, defaultOptions);
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));
      
      logger.warn('Validation failed', {
        source,
        url: req.url,
        method: req.method,
        errors,
        deviceId: dataToValidate.deviceId || 'unknown'
      });
      
      return badRequestResponse(res, 'Validation failed', errors);
    }
    
    // Replace the original data with validated and sanitized data
    req[source] = value;
    
    // Log successful validation for important endpoints
    if (source === 'body' && (req.url.includes('/device/update-data') || req.url.includes('/alert'))) {
      logger.debug('Validation successful', {
        source,
        url: req.url,
        method: req.method,
        deviceId: value.deviceId || 'unknown'
      });
    }
    
    next();
  };
};

/**
 * Validates location data from device updates
 */
const validateLocationData = createValidationMiddleware(locationDataSchema, 'body', {
  stripUnknown: true,
  allowUnknown: false
});

/**
 * Validates alert data
 */
const validateAlert = createValidationMiddleware(alertSchema, 'body', {
  stripUnknown: true,
  allowUnknown: false
});

/**
 * Validates device registration/update data
 */
const validateDevice = createValidationMiddleware(deviceSchema, 'body', {
  stripUnknown: true,
  allowUnknown: false
});

/**
 * Validates device history query parameters
 */
const validateDeviceHistoryQuery = createValidationMiddleware(deviceHistoryQuerySchema, 'query', {
  stripUnknown: true,
  allowUnknown: true // Allow additional query parameters
});

/**
 * Validates alerts query parameters
 */
const validateAlertsQuery = createValidationMiddleware(alertsQuerySchema, 'query', {
  stripUnknown: true,
  allowUnknown: true // Allow additional query parameters
});

/**
 * Validates device ID in URL parameters
 */
const validateDeviceId = (req, res, next) => {
  const { deviceId } = req.params;
  
  if (!deviceId) {
    return badRequestResponse(res, 'Device ID is required');
  }
  
  if (typeof deviceId !== 'string' || deviceId.length < 3 || deviceId.length > 50) {
    return badRequestResponse(res, 'Device ID must be a string between 3 and 50 characters');
  }
  
  if (!/^[a-zA-Z0-9]+$/.test(deviceId)) {
    return badRequestResponse(res, 'Device ID must contain only alphanumeric characters');
  }
  
  // Sanitize the device ID
  req.params.deviceId = deviceId.trim();
  
  next();
};

/**
 * Validates pagination parameters
 */
const validatePagination = (req, res, next) => {
  const { page = 1, limit = 10 } = req.query;
  
  const pageNum = parseInt(page, 10);
  const limitNum = parseInt(limit, 10);
  
  if (isNaN(pageNum) || pageNum < 1) {
    return badRequestResponse(res, 'Page must be a positive integer');
  }
  
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 1000) {
    return badRequestResponse(res, 'Limit must be between 1 and 1000');
  }
  
  req.query.page = pageNum;
  req.query.limit = limitNum;
  
  next();
};

/**
 * Validates date range parameters
 */
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;
  
  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return badRequestResponse(res, 'Invalid start date format');
    }
    req.query.startDate = start;
  }
  
  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return badRequestResponse(res, 'Invalid end date format');
    }
    req.query.endDate = end;
  }
  
  if (startDate && endDate && req.query.startDate > req.query.endDate) {
    return badRequestResponse(res, 'Start date must be before end date');
  }
  
  // Validate date range is not too large (max 1 year)
  if (startDate && endDate) {
    const oneYear = 365 * 24 * 60 * 60 * 1000; // milliseconds in a year
    if (req.query.endDate - req.query.startDate > oneYear) {
      return badRequestResponse(res, 'Date range cannot exceed 1 year');
    }
  }
  
  next();
};

/**
 * Validates coordinates in request body
 */
const validateCoordinates = (req, res, next) => {
  const { latitude, longitude } = req.body;
  
  if (latitude !== undefined) {
    const lat = parseFloat(latitude);
    if (isNaN(lat) || lat < -90 || lat > 90) {
      return badRequestResponse(res, 'Latitude must be between -90 and 90');
    }
    req.body.latitude = lat;
  }
  
  if (longitude !== undefined) {
    const lng = parseFloat(longitude);
    if (isNaN(lng) || lng < -180 || lng > 180) {
      return badRequestResponse(res, 'Longitude must be between -180 and 180');
    }
    req.body.longitude = lng;
  }
  
  next();
};

/**
 * Sanitizes string inputs to prevent XSS and injection attacks
 */
const sanitizeStrings = (req, res, next) => {
  const sanitizeString = (str) => {
    if (typeof str !== 'string') return str;
    
    // Remove HTML tags and trim whitespace
    return str.replace(/<[^>]*>/g, '').trim();
  };
  
  const sanitizeObject = (obj) => {
    if (obj === null || typeof obj !== 'object') return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(sanitizeObject);
    }
    
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        sanitized[key] = sanitizeString(value);
      } else if (typeof value === 'object') {
        sanitized[key] = sanitizeObject(value);
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  };
  
  if (req.body) {
    req.body = sanitizeObject(req.body);
  }
  
  if (req.query) {
    req.query = sanitizeObject(req.query);
  }
  
  next();
};

/**
 * Validates content type for POST/PUT requests
 */
const validateContentType = (req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !contentType.includes('application/json')) {
      return badRequestResponse(res, 'Content-Type must be application/json');
    }
  }
  
  next();
};

/**
 * Validates request body size
 */
const validateBodySize = (maxSize = '10mb') => {
  return (req, res, next) => {
    const contentLength = req.get('Content-Length');
    
    if (contentLength) {
      const sizeInMB = parseInt(contentLength) / (1024 * 1024);
      const maxSizeInMB = parseInt(maxSize);
      
      if (sizeInMB > maxSizeInMB) {
        return badRequestResponse(res, `Request body too large. Maximum size is ${maxSize}`);
      }
    }
    
    next();
  };
};

/**
 * Validates phone number in request body
 */
const validatePhoneNumber = (req, res, next) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return badRequestResponse(res, 'Phone number is required');
  }
  
  const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return badRequestResponse(res, 'Please enter a valid phone number');
  }
  
  req.body.phoneNumber = phoneNumber.trim();
  next();
};

/**
 * Validates OTP verification request
 */
const validateOTP = (req, res, next) => {
  const { phoneNumber, otp, purpose = 'login' } = req.body;
  
  if (!phoneNumber) {
    return badRequestResponse(res, 'Phone number is required');
  }
  
  if (!otp) {
    return badRequestResponse(res, 'OTP is required');
  }
  
  const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phoneNumber)) {
    return badRequestResponse(res, 'Please enter a valid phone number');
  }
  
  const otpRegex = /^\d{6}$/;
  if (!otpRegex.test(otp)) {
    return badRequestResponse(res, 'OTP must be 6 digits');
  }
  
  const validPurposes = ['login', 'registration', 'password_reset'];
  if (!validPurposes.includes(purpose)) {
    return badRequestResponse(res, 'Invalid purpose');
  }
  
  req.body.phoneNumber = phoneNumber.trim();
  req.body.otp = otp.trim();
  req.body.purpose = purpose;
  
  next();
};

/**
 * Validates profile update request
 */
const validateProfileUpdate = (req, res, next) => {
  const { name, email, preferences } = req.body;
  
  if (name !== undefined) {
    if (typeof name !== 'string' || name.length > 100) {
      return badRequestResponse(res, 'Name must be a string with maximum 100 characters');
    }
    req.body.name = name.trim();
  }
  
  if (email !== undefined) {
    if (typeof email !== 'string') {
      return badRequestResponse(res, 'Email must be a string');
    }
    // More robust email validation
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
      return badRequestResponse(res, 'Please enter a valid email address');
    }
    req.body.email = email.trim().toLowerCase();
  }
  
  if (preferences !== undefined) {
    if (typeof preferences !== 'object') {
      return badRequestResponse(res, 'Preferences must be an object');
    }
    
    if (preferences.units) {
      const { distance, temperature } = preferences.units;
      if (distance && !['km', 'miles'].includes(distance)) {
        return badRequestResponse(res, 'Distance unit must be km or miles');
      }
      if (temperature && !['celsius', 'fahrenheit'].includes(temperature)) {
        return badRequestResponse(res, 'Temperature unit must be celsius or fahrenheit');
      }
    }
  }
  
  next();
};

module.exports = {
  createValidationMiddleware,
  validateLocationData,
  validateAlert,
  validateDevice,
  validateDeviceHistoryQuery,
  validateAlertsQuery,
  validateDeviceId,
  validatePagination,
  validateDateRange,
  validateCoordinates,
  sanitizeStrings,
  validateContentType,
  validateBodySize,
  validatePhoneNumber,
  validateOTP,
  validateProfileUpdate
};