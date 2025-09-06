const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    unique: true,
    trim: true,
    match: [/^[+]?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  name: {
    type: String,
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Associated devices for this user
  devices: [{
    deviceId: {
      type: String,
      ref: 'Device'
    },
    alias: {
      type: String,
      trim: true,
      maxlength: [50, 'Device alias cannot exceed 50 characters']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // User preferences
  preferences: {
    notifications: {
      alerts: {
        type: Boolean,
        default: true
      },
      reports: {
        type: Boolean,
        default: true
      }
    },
    units: {
      distance: {
        type: String,
        enum: ['km', 'miles'],
        default: 'km'
      },
      temperature: {
        type: String,
        enum: ['celsius', 'fahrenheit'],
        default: 'celsius'
      }
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ phoneNumber: 1 });
userSchema.index({ isActive: 1 });

// Virtual for device count
userSchema.virtual('deviceCount').get(function() {
  return this.devices ? this.devices.length : 0;
});

// Method to add device to user
userSchema.methods.addDevice = function(deviceId, alias = '') {
  const existingDevice = this.devices.find(device => device.deviceId === deviceId);
  if (existingDevice) {
    throw new Error('Device already associated with this user');
  }
  
  this.devices.push({
    deviceId,
    alias,
    addedAt: new Date()
  });
  
  return this.save();
};

// Method to remove device from user
userSchema.methods.removeDevice = function(deviceId) {
  this.devices = this.devices.filter(device => device.deviceId !== deviceId);
  return this.save();
};

// Method to check if user owns device
userSchema.methods.ownsDevice = function(deviceId) {
  return this.devices.some(device => device.deviceId === deviceId);
};

module.exports = mongoose.model('User', userSchema);
