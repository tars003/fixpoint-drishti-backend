const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
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
    default: 20, // Alert when battery below 20%
    min: [0, 'Battery threshold cannot be negative'],
    max: [100, 'Battery threshold cannot exceed 100%']
  },
  alertSettings: {
    vibrationEnabled: { 
      type: Boolean, 
      default: true 
    },
    tamperingEnabled: { 
      type: Boolean, 
      default: true 
    },
    lowBatteryEnabled: { 
      type: Boolean, 
      default: true 
    },
    geofenceEnabled: {
      type: Boolean,
      default: false
    }
  },
  // Optional metadata
  hardware: {
    model: String,
    version: String,
    imei: String
  },
  // Geofence settings (optional)
  geofence: {
    enabled: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
// Note: deviceId index is automatically created by unique: true constraint
deviceSchema.index({ isActive: 1 });
deviceSchema.index({ lastSeen: -1 });

// Virtual for device status based on last seen
deviceSchema.virtual('status').get(function() {
  if (!this.isActive) return 'inactive';
  
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.lastSeen > fiveMinutesAgo ? 'online' : 'offline';
});

// Instance method to check if device is online
deviceSchema.methods.isOnline = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.isActive && this.lastSeen > fiveMinutesAgo;
};

// Static method to find active devices
deviceSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Static method to find offline devices
deviceSchema.statics.findOffline = function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.find({
    isActive: true,
    lastSeen: { $lt: fiveMinutesAgo }
  });
};

// Pre-save middleware
deviceSchema.pre('save', function(next) {
  if (this.isModified('lastSeen')) {
    // Update lastSeen to current time if being modified
    this.lastSeen = new Date();
  }
  next();
});

module.exports = mongoose.model('Device', deviceSchema);