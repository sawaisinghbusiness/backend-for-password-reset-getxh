const { validationResult } = require('express-validator');
const authService = require('../services/authService');

/**
 * Controller for POST /api/forgot-password
 */
async function forgotPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.requestForgotPassword(email, ipAddress);
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for POST /api/verify-reset-otp
 */
async function verifyResetOtp(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.verifyResetOtp(email, otp, ipAddress);
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for POST /api/reset-password
 */
async function resetPassword(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp, newPassword, confirmPassword } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await authService.resetPassword(email, otp, newPassword, confirmPassword, ipAddress);
    return res.status(result.status).json(result.body);
  } catch (error) {
    next(error);
  }
}

module.exports = {
  forgotPassword,
  verifyResetOtp,
  resetPassword
};
