const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    ref: 'Device',
    index: true
  },
  alertType: {
    type: String,
    required: [true, 'Alert type is required'],
    enum: {
      values: ['vibration', 'tampering', 'low_battery', 'geofence', 'offline', 'temperature', 'custom'],
      message: 'Invalid alert type'
    },
    index: true
  },
  severity: {
    type: String,
    enum: {
      values: ['low', 'medium', 'high', 'critical'],
      message: 'Invalid severity level'
    },
    default: 'medium',
    index: true
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true,
    maxlength: [100, 'Alert title cannot exceed 100 characters']
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true,
    maxlength: [500, 'Alert message cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      validate: {
        validator: function(coords) {
          return !coords || (coords.length === 2 && 
                 coords[0] >= -180 && coords[0] <= 180 && // longitude
                 coords[1] >= -90 && coords[1] <= 90);    // latitude
        },
        message: 'Invalid coordinates. Longitude must be between -180 and 180, latitude between -90 and 90'
      }
    }
  },
  data: {
    type: mongoose.Schema.Types.Mixed, // Additional alert-specific data
    default: {}
  },
  isResolved: {
    type: Boolean,
    default: false,
    index: true
  },
  resolvedAt: {
    type: Date,
    validate: {
      validator: function(resolvedAt) {
        return !resolvedAt || this.isResolved;
      },
      message: 'Resolved date can only be set when alert is resolved'
    }
  },
  resolvedBy: {
    type: String,
    trim: true
  },
  resolutionNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Resolution notes cannot exceed 1000 characters']
  },
  acknowledgedAt: {
    type: Date
  },
  acknowledgedBy: {
    type: String,
    trim: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  // Auto-resolve settings
  autoResolve: {
    enabled: {
      type: Boolean,
      default: false
    },
    timeoutMinutes: {
      type: Number,
      min: [1, 'Auto-resolve timeout must be at least 1 minute'],
      max: [1440, 'Auto-resolve timeout cannot exceed 24 hours']
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Compound indexes for efficient queries
alertSchema.index({ deviceId: 1, timestamp: -1 });
alertSchema.index({ alertType: 1, timestamp: -1 });
alertSchema.index({ severity: 1, timestamp: -1 });
alertSchema.index({ isResolved: 1, timestamp: -1 });
alertSchema.index({ timestamp: -1 });

// Geospatial index for location-based queries
alertSchema.index({ location: '2dsphere' });

// Virtual for alert age
alertSchema.virtual('ageInMinutes').get(function() {
  return Math.floor((Date.now() - this.timestamp.getTime()) / (1000 * 60));
});

// Virtual for resolution time
alertSchema.virtual('resolutionTimeMinutes').get(function() {
  if (this.isResolved && this.resolvedAt) {
    return Math.floor((this.resolvedAt.getTime() - this.timestamp.getTime()) / (1000 * 60));
  }
  return null;
});

// Virtual for status
alertSchema.virtual('status').get(function() {
  if (this.isResolved) return 'resolved';
  if (this.acknowledgedAt) return 'acknowledged';
  return 'open';
});

// Instance method to resolve alert
alertSchema.methods.resolve = function(resolvedBy = null, notes = null) {
  this.isResolved = true;
  this.resolvedAt = new Date();
  if (resolvedBy) this.resolvedBy = resolvedBy;
  if (notes) this.resolutionNotes = notes;
  return this.save();
};

// Instance method to acknowledge alert
alertSchema.methods.acknowledge = function(acknowledgedBy = null) {
  this.acknowledgedAt = new Date();
  if (acknowledgedBy) this.acknowledgedBy = acknowledgedBy;
  return this.save();
};

// Static method to find unresolved alerts
alertSchema.statics.findUnresolved = function(deviceId = null) {
  const query = { isResolved: false };
  if (deviceId) query.deviceId = deviceId;
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to find critical alerts
alertSchema.statics.findCritical = function(deviceId = null) {
  const query = { severity: 'critical', isResolved: false };
  if (deviceId) query.deviceId = deviceId;
  return this.find(query).sort({ timestamp: -1 });
};

// Static method to get alert statistics
alertSchema.statics.getStats = function(deviceId = null, startDate = null, endDate = null) {
  const match = {};
  if (deviceId) match.deviceId = deviceId;
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  return this.aggregate([
    { $match: match },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        resolved: { $sum: { $cond: ['$isResolved', 1, 0] } },
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
};

// Pre-save middleware to set title if not provided
alertSchema.pre('save', function(next) {
  if (!this.title && this.alertType) {
    const titleMap = {
      vibration: 'Vibration Detected',
      tampering: 'Tampering Alert',
      low_battery: 'Low Battery Warning',
      geofence: 'Geofence Violation',
      offline: 'Device Offline',
      temperature: 'Temperature Alert',
      custom: 'Custom Alert'
    };
    this.title = titleMap[this.alertType] || 'Alert';
  }
  next();
});

// Pre-save middleware for auto-resolve logic
alertSchema.pre('save', function(next) {
  if (this.isResolved && !this.resolvedAt) {
    this.resolvedAt = new Date();
  }
  next();
});

module.exports = mongoose.model('Alert', alertSchema);