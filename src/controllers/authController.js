const jwt = require('jsonwebtoken');
const User = require('../models/User');
const OTP = require('../models/OTP');
const { successResponse, badRequestResponse, serverErrorResponse, notFoundResponse } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Send OTP for login or registration
 * @route POST /api/v1/auth/send-otp
 */
const sendOTP = async (req, res) => {
  try {
    const { phoneNumber, purpose = 'login' } = req.body;

    if (!phoneNumber) {
      return badRequestResponse(res, 'Phone number is required');
    }

    // Validate phone number format
    const phoneRegex = /^[+]?[1-9]\d{1,14}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return badRequestResponse(res, 'Please enter a valid phone number');
    }

    // Check rate limiting
    const rateLimitCheck = await OTP.checkRateLimit(phoneNumber);
    if (rateLimitCheck.isLimited) {
      return serverErrorResponse(res, rateLimitCheck.error);
    }

    // Check if user exists and adjust purpose accordingly
    const existingUser = await User.findOne({ phoneNumber, isActive: true });
    const userExists = !!existingUser;
    let actualPurpose = purpose;
    let requiresRegistration = false;
    
    if (purpose === 'login' && !userExists) {
      // User trying to login but doesn't exist - they need to register
      actualPurpose = 'registration';
      requiresRegistration = true;
    } else if (purpose === 'registration' && userExists) {
      return badRequestResponse(res, 'User already exists with this phone number. Please use login instead.');
    }

    // Create OTP
    const metadata = {
      ip: req.ip,
      userAgent: req.get('User-Agent') || '',
      deviceInfo: req.get('X-Device-Info') || ''
    };

    const otpDoc = await OTP.createOTP(phoneNumber, actualPurpose, metadata);

    logger.info('OTP generated', {
      phoneNumber,
      purpose: actualPurpose,
      userExists,
      requiresRegistration,
      otpId: otpDoc._id,
      ip: req.ip
    });

    // In production, send OTP via SMS service
    // For development, we'll return the OTP in response (as per requirements)
    return successResponse(res, 'OTP sent successfully', {
      // DEVELOPMENT ONLY - Remove in production
      otp: otpDoc.otp,
      expiresIn: 600, // 10 minutes in seconds
      remaining: rateLimitCheck.remaining - 1,
      // Additional info for frontend
      userExists,
      requiresRegistration,
      purpose: actualPurpose
    });

  } catch (error) {
    logger.error('Send OTP error:', error);
    return serverErrorResponse(res, 'Failed to send OTP');
  }
};

/**
 * Verify OTP and complete login/registration
 * @route POST /api/v1/auth/verify-otp
 */
const verifyOTP = async (req, res) => {
  try {
    const { phoneNumber, otp, purpose = 'login', name, email } = req.body;

    if (!phoneNumber || !otp) {
      return badRequestResponse(res, 'Phone number and OTP are required');
    }

    // Verify OTP
    const verification = await OTP.verifyOTP(phoneNumber, otp, purpose);
    if (!verification.success) {
      return badRequestResponse(res, verification.error);
    }

    let user;

    if (purpose === 'registration') {
      // Double-check user doesn't exist (race condition protection)
      const existingUser = await User.findOne({ phoneNumber, isActive: true });
      if (existingUser) {
        return badRequestResponse(res, 'User already exists with this phone number');
      }

      // Create new user with error handling
      user = new User({
        phoneNumber,
        name: name || '',
        email: email || '',
        isVerified: true
      });
      
      try {
        await user.save();
      } catch (error) {
        if (error.code === 11000) { // MongoDB duplicate key error
          return badRequestResponse(res, 'User already exists with this phone number');
        }
        throw error;
      }

      logger.info('New user registered', {
        userId: user._id,
        phoneNumber,
        ip: req.ip
      });
    } else {
      // Find existing user
      user = await User.findOne({ phoneNumber, isActive: true });
      if (!user) {
        return notFoundResponse(res, 'User not found');
      }

      // Update verification status
      user.isVerified = true;
      await user.save();

      logger.info('User logged in', {
        userId: user._id,
        phoneNumber,
        ip: req.ip
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      },
      process.env.JWT_SECRET || 'your_jwt_secret_key',
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'drishti-backend',
        subject: user._id.toString()
      }
    );

    return successResponse(res, purpose === 'registration' ? 'Registration successful' : 'Login successful', {
      token,
      user: {
        id: user._id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        isVerified: user.isVerified,
        deviceCount: user.deviceCount,
        preferences: user.preferences
      }
    });

  } catch (error) {
    logger.error('Verify OTP error:', error);
    return serverErrorResponse(res, 'Failed to verify OTP');
  }
};

/**
 * Get current user profile
 * @route GET /api/v1/auth/profile
 */
const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('devices.deviceId', 'name description isActive lastSeen');

    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    return successResponse(res, { user });

  } catch (error) {
    logger.error('Get profile error:', error);
    return serverErrorResponse(res, 'Failed to fetch profile');
  }
};

/**
 * Update user profile
 * @route PUT /api/v1/auth/profile
 */
const updateProfile = async (req, res) => {
  try {
    const { name, email, preferences } = req.body;
    
    const user = await User.findById(req.user.id);
    if (!user) {
      return notFoundResponse(res, 'User not found');
    }

    // Update fields
    if (name !== undefined) user.name = name;
    if (email !== undefined) user.email = email;
    if (preferences !== undefined) {
      user.preferences = { ...user.preferences, ...preferences };
    }

    await user.save();

    logger.info('Profile updated', {
      userId: user._id,
      ip: req.ip
    });

    return successResponse(res, 'Profile updated successfully', {
      user
    });

  } catch (error) {
    logger.error('Update profile error:', error);
    return serverErrorResponse(res, 'Failed to update profile');
  }
};

/**
 * Refresh JWT token
 * @route POST /api/v1/auth/refresh
 */
const refreshToken = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user || !user.isActive) {
      return notFoundResponse(res, 'User not found or inactive');
    }

    // Validate JWT secret exists
    if (!process.env.JWT_SECRET) {
      logger.error('JWT_SECRET environment variable is not set');
      return serverErrorResponse(res, 'Authentication system not properly configured');
    }

    // Generate new JWT token
    const token = jwt.sign(
      {
        id: user._id,
        phoneNumber: user.phoneNumber,
        isVerified: user.isVerified
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || '7d',
        issuer: 'drishti-backend',
        subject: user._id.toString()
      }
    );

    return successResponse(res, 'Token refreshed successfully', {
      token
    });

  } catch (error) {
    logger.error('Refresh token error:', error);
    return serverErrorResponse(res, 'Failed to refresh token');
  }
};

module.exports = {
  sendOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  refreshToken
};
