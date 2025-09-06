const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  phoneNumber: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true,
    match: [/^[+]?[1-9]\d{1,14}$/, 'Please enter a valid phone number']
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
    length: 6,
    match: [/^\d{6}$/, 'OTP must be 6 digits']
  },
  purpose: {
    type: String,
    enum: ['registration', 'login', 'password_reset'],
    required: [true, 'OTP purpose is required']
  },
  expiresAt: {
    type: Date,
    required: true,
    default: function() {
      return new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now
    }
  },
  isUsed: {
    type: Boolean,
    default: false
  },
  attempts: {
    type: Number,
    default: 0,
    max: [3, 'Maximum 3 verification attempts allowed']
  },
  isBlocked: {
    type: Boolean,
    default: false
  },
  metadata: {
    ip: String,
    userAgent: String,
    deviceInfo: String
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
otpSchema.index({ phoneNumber: 1, purpose: 1 });
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index - auto delete expired documents
otpSchema.index({ isUsed: 1 });

// Virtual for checking if OTP is expired
otpSchema.virtual('isExpired').get(function() {
  return new Date() > this.expiresAt;
});

// Virtual for checking if OTP is valid for use
otpSchema.virtual('isValid').get(function() {
  return !this.isUsed && !this.isExpired && !this.isBlocked && this.attempts < 3;
});

// Static method to generate random 6-digit OTP
otpSchema.statics.generateOTP = function() {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Static method to create new OTP
otpSchema.statics.createOTP = async function(phoneNumber, purpose, metadata = {}) {
  // Invalidate any existing unused OTPs for this phone number and purpose
  await this.updateMany(
    { 
      phoneNumber, 
      purpose, 
      isUsed: false,
      isBlocked: false
    },
    { 
      isUsed: true // Mark old OTPs as used
    }
  );
  
  // Generate new OTP
  const otp = this.generateOTP();
  
  // Create new OTP document
  const newOtp = new this({
    phoneNumber,
    otp,
    purpose,
    metadata
  });
  
  await newOtp.save();
  return newOtp;
};

// Static method to verify OTP
otpSchema.statics.verifyOTP = async function(phoneNumber, otp, purpose) {
  const otpDoc = await this.findOne({
    phoneNumber,
    otp,
    purpose,
    isUsed: false,
    isBlocked: false
  });
  
  if (!otpDoc) {
    return {
      success: false,
      error: 'Invalid OTP',
      code: 'INVALID_OTP'
    };
  }
  
  // Check if expired
  if (otpDoc.isExpired) {
    return {
      success: false,
      error: 'OTP has expired',
      code: 'EXPIRED_OTP'
    };
  }
  
  // Check attempts
  if (otpDoc.attempts >= 3) {
    otpDoc.isBlocked = true;
    await otpDoc.save();
    return {
      success: false,
      error: 'Maximum verification attempts exceeded',
      code: 'MAX_ATTEMPTS_EXCEEDED'
    };
  }
  
  // Increment attempts
  otpDoc.attempts += 1;
  
  // Mark as used on successful verification
  otpDoc.isUsed = true;
  await otpDoc.save();
  
  return {
    success: true,
    message: 'OTP verified successfully',
    otpId: otpDoc._id
  };
};

// Static method to check rate limiting (max OTPs per phone per hour)
otpSchema.statics.checkRateLimit = async function(phoneNumber, maxOtpsPerHour = 5) {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const recentOtpsCount = await this.countDocuments({
    phoneNumber,
    createdAt: { $gte: oneHourAgo }
  });
  
  if (recentOtpsCount >= maxOtpsPerHour) {
    return {
      isLimited: true,
      error: `Maximum ${maxOtpsPerHour} OTPs allowed per hour`,
      code: 'RATE_LIMITED'
    };
  }
  
  return {
    isLimited: false,
    remaining: maxOtpsPerHour - recentOtpsCount
  };
};

module.exports = mongoose.model('OTP', otpSchema);
