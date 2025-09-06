const express = require('express');
const router = express.Router();

// Controllers
const {
  sendOTP,
  verifyOTP,
  getProfile,
  updateProfile,
  refreshToken
} = require('../controllers/authController');

// Middleware
const {
  authenticateToken
} = require('../middleware/auth');


const {
  validatePhoneNumber,
  validateOTP,
  validateProfileUpdate,
  sanitizeStrings,
  validateContentType
} = require('../middleware/validation');

const {
  securityHeaders
} = require('../middleware/auth');

// Apply common middleware to all routes
router.use(securityHeaders);
router.use(sanitizeStrings);

/**
 * @route   POST /api/v1/auth/send-otp
 * @desc    Send OTP to phone number for login or registration
 * @access  Public
 * @body    { phoneNumber, purpose? }
 */
router.post('/send-otp',
  validateContentType,
  validatePhoneNumber,
  sendOTP
);

/**
 * @route   POST /api/v1/auth/verify-otp
 * @desc    Verify OTP and complete login/registration
 * @access  Public
 * @body    { phoneNumber, otp, purpose?, name?, email? }
 */
router.post('/verify-otp',
  validateContentType,
  validateOTP,
  verifyOTP
);

/**
 * @route   GET /api/v1/auth/profile
 * @desc    Get current user profile
 * @access  Private (JWT required)
 */
router.get('/profile',
  authenticateToken,
  getProfile
);

/**
 * @route   PUT /api/v1/auth/profile
 * @desc    Update user profile
 * @access  Private (JWT required)
 * @body    { name?, email?, preferences? }
 */
router.put('/profile',
  validateContentType,
  authenticateToken,
  validateProfileUpdate,
  updateProfile
);

/**
 * @route   POST /api/v1/auth/refresh
 * @desc    Refresh JWT token
 * @access  Private (JWT required)
 */
router.post('/refresh',
  authenticateToken,
  refreshToken
);

module.exports = router;
