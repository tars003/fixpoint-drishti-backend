const mongoose = require('mongoose');

const locationDataSchema = new mongoose.Schema({
  deviceId: {
    type: String,
    required: [true, 'Device ID is required'],
    ref: 'Device',
    index: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]  
      required: [true, 'Location coordinates are required']
      // REMOVED: Coordinate range validation
    }
  },
  altitude: {
    type: Number
  },
  speed: {
    type: Number
  },
  course: {
    type: Number
  },
  accuracy: {
    type: Number
  },
  satellites: {
    type: Number
  },
  batteryVoltage: {
    type: Number,
    required: [true, 'Battery voltage is required']
  },
  batteryPercentage: {
    type: Number
  },
  // OBD2 Data Fields
  engineRpm: {
    type: Number
  },
  vehicleSpeed: {
    type: Number
  },
  engineLoad: {
    type: Number
  },
  coolantTemperature: {
    type: Number
  },
  fuelLevel: {
    type: Number
  },
  throttlePosition: {
    type: Number
  },
  intakeAirTemperature: {
    type: Number
  },
  mafAirFlowRate: {
    type: Number
  },
  fuelPressure: {
    type: Number
  },
  engineRuntime: {
    type: Number
  },
  distanceTraveled: {
    type: Number
  },
  barometricPressure: {
    type: Number
  },
  // Additional data field for any custom JSON data
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  signalStrength: {
    type: Number
  },
  temperature: {
    type: Number
  },
  humidity: {
    type: Number
  },
  timestamp: {
    type: Date,
    required: [true, 'Timestamp is required'],
    default: Date.now,
    index: true
  }
}, {
  // MongoDB Time Series Collection configuration
  timeseries: {
    timeField: 'timestamp',
    metaField: 'deviceId',
    granularity: 'minutes'
  },
  // Expire documents after 2 years (adjust as needed)
  expireAfterSeconds: 63072000,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Geospatial index for location queries
locationDataSchema.index({ location: '2dsphere' });

// Compound indexes for common queries
locationDataSchema.index({ deviceId: 1, timestamp: -1 });
locationDataSchema.index({ timestamp: -1 });
locationDataSchema.index({ batteryVoltage: 1 });

// Virtual for battery status
locationDataSchema.virtual('batteryStatus').get(function() {
  const voltage = this.batteryVoltage;
  if (voltage < 3.3) return 'critical';
  if (voltage < 3.6) return 'low';
  if (voltage < 3.8) return 'medium';
  return 'good';
});

// Virtual for location as [lat, lng] for easier frontend consumption
locationDataSchema.virtual('latLng').get(function() {
  if (this.location && this.location.coordinates) {
    return [this.location.coordinates[1], this.location.coordinates[0]]; // [lat, lng]
  }
  return null;
});

// Static method to find recent locations for a device
locationDataSchema.statics.findRecent = function(deviceId, limit = 10) {
  return this.find({ deviceId })
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to find locations within date range
locationDataSchema.statics.findByDateRange = function(deviceId, startDate, endDate, limit = 100) {
  const query = { deviceId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }
  
  return this.find(query)
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Static method to find locations within a radius
locationDataSchema.statics.findNearby = function(longitude, latitude, radiusInMeters, limit = 10) {
  return this.find({
    location: {
      $near: {
        $geometry: {
          type: 'Point',
          coordinates: [longitude, latitude]
        },
        $maxDistance: radiusInMeters
      }
    }
  }).limit(limit);
};

// Pre-save middleware to calculate battery percentage if not provided
locationDataSchema.pre('save', function(next) {
  if (!this.batteryPercentage && this.batteryVoltage) {
    // Simple linear conversion from voltage to percentage
    // Adjust these values based on your battery specifications
    const minVoltage = 3.0;
    const maxVoltage = 4.2;
    
    this.batteryPercentage = Math.max(0, Math.min(100, 
      ((this.batteryVoltage - minVoltage) / (maxVoltage - minVoltage)) * 100
    ));
  }
  next();
});

module.exports = mongoose.model('LocationData', locationDataSchema);