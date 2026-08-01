const rateLimit = require('express-rate-limit');
const env = require('../config/env');
const { logSecurityEvent, SECURITY_EVENTS } = require('../utils/logger');

const handleRateLimitExceeded = (req, res, next, options) => {
  logSecurityEvent(SECURITY_EVENTS.RATE_LIMIT_EXCEEDED, {
    ip: req.ip,
    path: req.originalUrl
  });

  res.status(options.statusCode).json({
    success: false,
    message: options.message
  });
};

/**
 * Rate limiter for POST /api/forgot-password (5 requests / hour / IP)
 */
const forgotPasswordLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.FORGOT_PASSWORD_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset requests from this IP. Please try again after 15 minutes.',
  handler: handleRateLimitExceeded,
  skip: () => process.env.NODE_ENV === 'test'
});

/**
 * Rate limiter for POST /api/verify-reset-otp (50 requests / 15 min / IP)
 */
const verifyOtpLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.VERIFY_OTP_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many verification attempts from this IP. Please try again after 15 minutes.',
  handler: handleRateLimitExceeded,
  skip: () => process.env.NODE_ENV === 'test'
});

/**
 * Rate limiter for POST /api/reset-password (50 requests / 15 min / IP)
 */
const resetPasswordLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RESET_PASSWORD_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many password reset attempts from this IP. Please try again after 15 minutes.',
  handler: handleRateLimitExceeded,
  skip: () => process.env.NODE_ENV === 'test'
});

module.exports = {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter
};
