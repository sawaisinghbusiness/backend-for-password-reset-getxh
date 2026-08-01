const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter
} = require('../middlewares/rateLimiter');

const router = express.Router();

/**
 * @route   POST /api/forgot-password
 * @desc    Initiate password reset, send 6-digit OTP via Brevo
 * @access  Public (Rate Limited: 5/hr/IP)
 */
router.post(
  '/forgot-password',
  forgotPasswordLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required.')
      .isEmail()
      .withMessage('Please enter a valid email address.')
  ],
  authController.forgotPassword
);

/**
 * @route   POST /api/verify-reset-otp
 * @desc    Verify 6-digit numeric OTP before allowing password change
 * @access  Public (Rate Limited: 10/hr/IP)
 */
router.post(
  '/verify-reset-otp',
  verifyOtpLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required.')
      .isEmail()
      .withMessage('Please enter a valid email address.'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('OTP is required.')
      .isNumeric()
      .withMessage('OTP must contain only numbers.')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits.')
  ],
  authController.verifyResetOtp
);

/**
 * @route   POST /api/reset-password
 * @desc    Reset user password in Firebase Auth & revoke refresh tokens
 * @access  Public (Rate Limited: 5/hr/IP)
 */
router.post(
  '/reset-password',
  resetPasswordLimiter,
  [
    body('email')
      .trim()
      .notEmpty()
      .withMessage('Email address is required.')
      .isEmail()
      .withMessage('Please enter a valid email address.'),
    body('otp')
      .trim()
      .notEmpty()
      .withMessage('OTP is required.')
      .isNumeric()
      .withMessage('OTP must be numeric.')
      .isLength({ min: 6, max: 6 })
      .withMessage('OTP must be exactly 6 digits.'),
    body('newPassword')
      .notEmpty()
      .withMessage('New password is required.')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long.'),
    body('confirmPassword')
      .notEmpty()
      .withMessage('Password confirmation is required.')
  ],
  authController.resetPassword
);

module.exports = router;
