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

const forgotPasswordLimiter = (req, res, next) => next();
const verifyOtpLimiter = (req, res, next) => next();

/**
 * Rate limiter for POST /api/reset-password — Disabled (No IP blocking)
 */
const resetPasswordLimiter = (req, res, next) => next();

module.exports = {
  forgotPasswordLimiter,
  verifyOtpLimiter,
  resetPasswordLimiter
};
