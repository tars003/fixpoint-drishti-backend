/**
 * Utility helper functions
 */

/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @returns {number} Distance in meters
 */
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
          Math.cos(φ1) * Math.cos(φ2) *
          Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  return R * c; // Distance in meters
};

/**
 * Convert battery voltage to percentage (rough estimation)
 * @param {number} voltage - Battery voltage
 * @param {number} minVoltage - Minimum voltage (default: 3.0V)
 * @param {number} maxVoltage - Maximum voltage (default: 4.2V)
 * @returns {number} Battery percentage (0-100)
 */
const voltageToPercentage = (voltage, minVoltage = 3.0, maxVoltage = 4.2) => {
  if (voltage <= minVoltage) return 0;
  if (voltage >= maxVoltage) return 100;
  
  return Math.round(((voltage - minVoltage) / (maxVoltage - minVoltage)) * 100);
};

/**
 * Format coordinates for display
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} precision - Decimal places (default: 6)
 * @returns {Object} Formatted coordinates
 */
const formatCoordinates = (latitude, longitude, precision = 6) => {
  return {
    latitude: parseFloat(latitude.toFixed(precision)),
    longitude: parseFloat(longitude.toFixed(precision)),
    formatted: `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`
  };
};

/**
 * Check if a point is within a circular geofence
 * @param {number} pointLat - Point latitude
 * @param {number} pointLon - Point longitude
 * @param {number} centerLat - Geofence center latitude
 * @param {number} centerLon - Geofence center longitude
 * @param {number} radius - Geofence radius in meters
 * @returns {boolean} True if point is within geofence
 */
const isWithinGeofence = (pointLat, pointLon, centerLat, centerLon, radius) => {
  const distance = calculateDistance(pointLat, pointLon, centerLat, centerLon);
  return distance <= radius;
};

/**
 * Generate device ID (if not provided)
 * @param {string} prefix - Prefix for device ID (default: 'DEV')
 * @returns {string} Generated device ID
 */
const generateDeviceId = (prefix = 'DEV') => {
  const timestamp = Date.now().toString(36);
  const randomStr = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${randomStr}`.toUpperCase();
};

/**
 * Validate coordinates
 * @param {number} latitude - Latitude to validate
 * @param {number} longitude - Longitude to validate
 * @returns {Object} Validation result
 */
const validateCoordinates = (latitude, longitude) => {
  const errors = [];
  
  if (typeof latitude !== 'number' || isNaN(latitude)) {
    errors.push('Latitude must be a valid number');
  } else if (latitude < -90 || latitude > 90) {
    errors.push('Latitude must be between -90 and 90');
  }
  
  if (typeof longitude !== 'number' || isNaN(longitude)) {
    errors.push('Longitude must be a valid number');
  } else if (longitude < -180 || longitude > 180) {
    errors.push('Longitude must be between -180 and 180');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate speed from two location points
 * @param {Object} point1 - First location point {lat, lon, timestamp}
 * @param {Object} point2 - Second location point {lat, lon, timestamp}
 * @returns {number} Speed in km/h
 */
const calculateSpeed = (point1, point2) => {
  const distance = calculateDistance(point1.lat, point1.lon, point2.lat, point2.lon);
  const timeDiff = (point2.timestamp - point1.timestamp) / 1000; // seconds
  
  if (timeDiff <= 0) return 0;
  
  const speedMps = distance / timeDiff; // meters per second
  return speedMps * 3.6; // convert to km/h
};

/**
 * Format duration in human readable format
 * @param {number} milliseconds - Duration in milliseconds
 * @returns {string} Formatted duration
 */
const formatDuration = (milliseconds) => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days}d ${hours % 24}h ${minutes % 60}m`;
  } else if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Get battery status description
 * @param {number} voltage - Battery voltage
 * @param {number} percentage - Battery percentage (optional)
 * @returns {Object} Battery status info
 */
const getBatteryStatus = (voltage, percentage = null) => {
  let status = 'unknown';
  let color = 'gray';
  let icon = '🔋';
  
  if (voltage < 3.0) {
    status = 'critical';
    color = 'red';
    icon = '🪫';
  } else if (voltage < 3.3) {
    status = 'low';
    color = 'orange';
    icon = '🔋';
  } else if (voltage < 3.6) {
    status = 'medium';
    color = 'yellow';
    icon = '🔋';
  } else if (voltage >= 3.6) {
    status = 'good';
    color = 'green';
    icon = '🔋';
  }
  
  return {
    voltage,
    percentage: percentage || voltageToPercentage(voltage),
    status,
    color,
    icon,
    description: `${status.charAt(0).toUpperCase() + status.slice(1)} (${voltage}V)`
  };
};

/**
 * Sanitize string input
 * @param {string} input - Input string to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string} Sanitized string
 */
const sanitizeString = (input, maxLength = null) => {
  if (typeof input !== 'string') return '';
  
  let sanitized = input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>\"']/g, '') // Remove potentially dangerous characters
    .trim();
  
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }
  
  return sanitized;
};

/**
 * Generate API key
 * @param {number} length - Key length (default: 32)
 * @returns {string} Generated API key
 */
const generateApiKey = (length = 32) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

/**
 * Deep clone an object
 * @param {Object} obj - Object to clone
 * @returns {Object} Cloned object
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const cloned = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
};

/**
 * Get time ago string
 * @param {Date} date - Date to compare
 * @returns {string} Time ago string
 */
const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return `${diffSecs} seconds ago`;
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  
  return date.toLocaleDateString();
};

/**
 * Check if value is empty (null, undefined, empty string, empty array, empty object)
 * @param {*} value - Value to check
 * @returns {boolean} True if empty
 */
const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  if (Array.isArray(value) && value.length === 0) return true;
  if (typeof value === 'object' && Object.keys(value).length === 0) return true;
  return false;
};

module.exports = {
  calculateDistance,
  voltageToPercentage,
  formatCoordinates,
  isWithinGeofence,
  generateDeviceId,
  validateCoordinates,
  calculateSpeed,
  formatDuration,
  getBatteryStatus,
  sanitizeString,
  generateApiKey,
  deepClone,
  getTimeAgo,
  isEmpty
};