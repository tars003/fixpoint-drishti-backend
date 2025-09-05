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
    type: Number,
    min: [-1000, 'Altitude cannot be less than -1000 meters'],
    max: [50000, 'Altitude cannot exceed 50000 meters']
  },
  speed: {
    type: Number,
    min: [0, 'Speed cannot be negative'],
    max: [1000, 'Speed cannot exceed 1000 km/h']
  },
  course: {
    type: Number,
    min: [0, 'Course must be between 0 and 360 degrees'],
    max: [360, 'Course must be between 0 and 360 degrees']
  },
  accuracy: {
    type: Number,
    min: [0, 'Accuracy cannot be negative']
  },
  satellites: {
    type: Number,
    min: [0, 'Number of satellites cannot be negative'],
    max: [50, 'Number of satellites cannot exceed 50']
  },
  batteryVoltage: {
    type: Number,
    required: [true, 'Battery voltage is required'],
    min: [0, 'Battery voltage cannot be negative'],
    max: [50, 'Battery voltage cannot exceed 50V']
  },
  batteryPercentage: {
    type: Number,
    min: [0, 'Battery percentage cannot be negative'],
    max: [100, 'Battery percentage cannot exceed 100%']
  },
  // OBD2 Data Fields
  engineRpm: {
    type: Number,
    min: [0, 'Engine RPM cannot be negative'],
    max: [10000, 'Engine RPM cannot exceed 10000']
  },
  vehicleSpeed: {
    type: Number,
    min: [0, 'Vehicle speed cannot be negative'],
    max: [500, 'Vehicle speed cannot exceed 500 km/h']
  },
  engineLoad: {
    type: Number,
    min: [0, 'Engine load cannot be negative'],
    max: [100, 'Engine load cannot exceed 100%']
  },
  coolantTemperature: {
    type: Number,
    min: [-40, 'Coolant temperature cannot be less than -40°C'],
    max: [215, 'Coolant temperature cannot exceed 215°C']
  },
  fuelLevel: {
    type: Number,
    min: [0, 'Fuel level cannot be negative'],
    max: [100, 'Fuel level cannot exceed 100%']
  },
  throttlePosition: {
    type: Number,
    min: [0, 'Throttle position cannot be negative'],
    max: [100, 'Throttle position cannot exceed 100%']
  },
  intakeAirTemperature: {
    type: Number,
    min: [-40, 'Intake air temperature cannot be less than -40°C'],
    max: [215, 'Intake air temperature cannot exceed 215°C']
  },
  mafAirFlowRate: {
    type: Number,
    min: [0, 'MAF air flow rate cannot be negative'],
    max: [655.35, 'MAF air flow rate cannot exceed 655.35 g/s']
  },
  fuelPressure: {
    type: Number,
    min: [0, 'Fuel pressure cannot be negative'],
    max: [765, 'Fuel pressure cannot exceed 765 kPa']
  },
  engineRuntime: {
    type: Number,
    min: [0, 'Engine runtime cannot be negative'],
    max: [4294967295, 'Engine runtime cannot exceed maximum value']
  },
  distanceTraveled: {
    type: Number,
    min: [0, 'Distance traveled cannot be negative'],
    max: [65535, 'Distance traveled cannot exceed 65535 km']
  },
  barometricPressure: {
    type: Number,
    min: [0, 'Barometric pressure cannot be negative'],
    max: [255, 'Barometric pressure cannot exceed 255 kPa']
  },
  // Additional data field for any custom JSON data
  additionalData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  signalStrength: {
    type: Number,
    min: [-120, 'Signal strength cannot be less than -120 dBm'],
    max: [0, 'Signal strength cannot exceed 0 dBm']
  },
  temperature: {
    type: Number,
    min: [-50, 'Temperature cannot be less than -50°C'],
    max: [100, 'Temperature cannot exceed 100°C']
  },
  humidity: {
    type: Number,
    min: [0, 'Humidity cannot be negative'],
    max: [100, 'Humidity cannot exceed 100%']
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