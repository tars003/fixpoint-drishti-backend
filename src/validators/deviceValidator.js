const Joi = require('joi');

// Base validation schemas
const coordinatesSchema = Joi.object({
  latitude: Joi.number().min(-90).max(90).required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'number.base': 'Latitude must be a valid number',
      'any.required': 'Latitude is required'
    }),
  longitude: Joi.number().min(-180).max(180).required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'number.base': 'Longitude must be a valid number',
      'any.required': 'Longitude is required'
    })
});

// Location data validation schema
const locationDataSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).required()
    .messages({
      'string.empty': 'Device ID is required',
      'string.alphanum': 'Device ID must contain only alphanumeric characters',
      'string.min': 'Device ID must be at least 3 characters',
      'string.max': 'Device ID must not exceed 50 characters',
      'any.required': 'Device ID is required'
    }),
  
  latitude: Joi.number().min(-90).max(90).required()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'number.base': 'Latitude must be a valid number',
      'any.required': 'Latitude is required'
    }),
  
  longitude: Joi.number().min(-180).max(180).required()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'number.base': 'Longitude must be a valid number',
      'any.required': 'Longitude is required'
    }),
  
  altitude: Joi.number().min(-1000).max(50000).optional()
    .messages({
      'number.min': 'Altitude cannot be less than -1000 meters',
      'number.max': 'Altitude cannot exceed 50000 meters',
      'number.base': 'Altitude must be a valid number'
    }),
  
  speed: Joi.number().min(0).max(1000).optional()
    .messages({
      'number.min': 'Speed cannot be negative',
      'number.max': 'Speed cannot exceed 1000 km/h',
      'number.base': 'Speed must be a valid number'
    }),
  
  course: Joi.number().min(0).max(360).optional()
    .messages({
      'number.min': 'Course must be between 0 and 360 degrees',
      'number.max': 'Course must be between 0 and 360 degrees',
      'number.base': 'Course must be a valid number'
    }),
  
  accuracy: Joi.number().min(0).optional()
    .messages({
      'number.min': 'Accuracy cannot be negative',
      'number.base': 'Accuracy must be a valid number'
    }),
  
  satellites: Joi.number().integer().min(0).max(50).optional()
    .messages({
      'number.base': 'Number of satellites must be a valid number',
      'number.integer': 'Number of satellites must be an integer',
      'number.min': 'Number of satellites cannot be negative',
      'number.max': 'Number of satellites cannot exceed 50'
    }),
  
  batteryVoltage: Joi.number().min(0).max(50).required()
    .messages({
      'number.base': 'Battery voltage must be a valid number',
      'number.min': 'Battery voltage cannot be negative',
      'number.max': 'Battery voltage cannot exceed 50V',
      'any.required': 'Battery voltage is required'
    }),
  
  batteryPercentage: Joi.number().min(0).max(100).optional()
    .messages({
      'number.base': 'Battery percentage must be a valid number',
      'number.min': 'Battery percentage cannot be negative',
      'number.max': 'Battery percentage cannot exceed 100%'
    }),
  
  digitalInputs: Joi.object().pattern(
    Joi.string(),
    Joi.boolean()
  ).optional()
    .messages({
      'object.base': 'Digital inputs must be an object',
      'boolean.base': 'Digital input values must be boolean'
    }),
  
  analogInputs: Joi.object().pattern(
    Joi.string(),
    Joi.number().min(0).max(1024)
  ).optional()
    .messages({
      'object.base': 'Analog inputs must be an object',
      'number.base': 'Analog input values must be numbers',
      'number.min': 'Analog input values cannot be negative',
      'number.max': 'Analog input values cannot exceed 1024'
    }),
  
  signalStrength: Joi.number().min(-120).max(0).optional()
    .messages({
      'number.base': 'Signal strength must be a valid number',
      'number.min': 'Signal strength cannot be less than -120 dBm',
      'number.max': 'Signal strength cannot exceed 0 dBm'
    }),
  
  temperature: Joi.number().min(-50).max(100).optional()
    .messages({
      'number.base': 'Temperature must be a valid number',
      'number.min': 'Temperature cannot be less than -50°C',
      'number.max': 'Temperature cannot exceed 100°C'
    }),
  
  humidity: Joi.number().min(0).max(100).optional()
    .messages({
      'number.base': 'Humidity must be a valid number',
      'number.min': 'Humidity cannot be negative',
      'number.max': 'Humidity cannot exceed 100%'
    }),
  
  timestamp: Joi.date().optional()
    .messages({
      'date.base': 'Timestamp must be a valid date'
    })
});

// Alert validation schema
const alertSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).required()
    .messages({
      'string.empty': 'Device ID is required',
      'string.alphanum': 'Device ID must contain only alphanumeric characters',
      'string.min': 'Device ID must be at least 3 characters',
      'string.max': 'Device ID must not exceed 50 characters',
      'any.required': 'Device ID is required'
    }),
  
  alertType: Joi.string()
    .valid('vibration', 'tampering', 'low_battery', 'geofence', 'offline', 'temperature', 'custom', 'watchdog_triggered', 'gps_malfunction', 'obd2_malfunction', 'gyroscope_malfunction')
    .required()
    .messages({
      'any.only': 'Alert type must be one of: vibration, tampering, low_battery, geofence, offline, temperature, custom, watchdog_triggered, gps_malfunction, obd2_malfunction, gyroscope_malfunction',
      'any.required': 'Alert type is required'
    }),
  
  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .default('medium')
    .messages({
      'any.only': 'Severity must be one of: low, medium, high, critical'
    }),
  
  title: Joi.string().min(1).max(100).optional()
    .messages({
      'string.empty': 'Title cannot be empty',
      'string.min': 'Title must be at least 1 character',
      'string.max': 'Title cannot exceed 100 characters'
    }),
  
  message: Joi.string().min(1).max(500).required()
    .messages({
      'string.empty': 'Message is required',
      'string.min': 'Message must be at least 1 character',
      'string.max': 'Message cannot exceed 500 characters',
      'any.required': 'Message is required'
    }),
  
  latitude: Joi.number().min(-90).max(90).optional()
    .messages({
      'number.min': 'Latitude must be between -90 and 90',
      'number.max': 'Latitude must be between -90 and 90',
      'number.base': 'Latitude must be a valid number'
    }),
  
  longitude: Joi.number().min(-180).max(180).optional()
    .messages({
      'number.min': 'Longitude must be between -180 and 180',
      'number.max': 'Longitude must be between -180 and 180',
      'number.base': 'Longitude must be a valid number'
    }),
  
  data: Joi.object().optional()
    .messages({
      'object.base': 'Data must be an object'
    })
});

// Device registration/update schema
const deviceSchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).required()
    .messages({
      'string.empty': 'Device ID is required',
      'string.alphanum': 'Device ID must contain only alphanumeric characters',
      'string.min': 'Device ID must be at least 3 characters',
      'string.max': 'Device ID must not exceed 50 characters',
      'any.required': 'Device ID is required'
    }),
  
  name: Joi.string().min(1).max(100).required()
    .messages({
      'string.empty': 'Device name is required',
      'string.min': 'Device name must be at least 1 character',
      'string.max': 'Device name cannot exceed 100 characters',
      'any.required': 'Device name is required'
    }),
  
  description: Joi.string().max(500).optional()
    .messages({
      'string.max': 'Description cannot exceed 500 characters'
    }),
  
  batteryThreshold: Joi.number().min(0).max(100).default(20)
    .messages({
      'number.base': 'Battery threshold must be a valid number',
      'number.min': 'Battery threshold cannot be negative',
      'number.max': 'Battery threshold cannot exceed 100%'
    }),
  
  alertSettings: Joi.object({
    vibrationEnabled: Joi.boolean().default(true),
    tamperingEnabled: Joi.boolean().default(true),
    lowBatteryEnabled: Joi.boolean().default(true),
    geofenceEnabled: Joi.boolean().default(false)
  }).optional(),
  
  hardware: Joi.object({
    model: Joi.string().max(50).optional(),
    version: Joi.string().max(20).optional(),
    imei: Joi.string().length(15).optional()
  }).optional()
});

// Query validation schemas
const deviceHistoryQuerySchema = Joi.object({
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  limit: Joi.number().integer().min(1).max(1000).default(100),
  page: Joi.number().integer().min(1).default(1)
});

const alertsQuerySchema = Joi.object({
  deviceId: Joi.string().alphanum().min(3).max(50).optional(),
  alertType: Joi.string()
    .valid('vibration', 'tampering', 'low_battery', 'geofence', 'offline', 'temperature', 'custom', 'watchdog_triggered', 'gps_malfunction', 'obd2_malfunction', 'gyroscope_malfunction')
    .optional(),
  severity: Joi.string()
    .valid('low', 'medium', 'high', 'critical')
    .optional(),
  isResolved: Joi.boolean().optional(),
  startDate: Joi.date().optional(),
  endDate: Joi.date().min(Joi.ref('startDate')).optional(),
  limit: Joi.number().integer().min(1).max(100).default(50),
  page: Joi.number().integer().min(1).default(1)
});

module.exports = {
  locationDataSchema,
  alertSchema,
  deviceSchema,
  coordinatesSchema,
  deviceHistoryQuerySchema,
  alertsQuerySchema
};