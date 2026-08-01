const winston = require('winston');

// Security Event Constants
const SECURITY_EVENTS = {
  FORGOT_PASSWORD_REQUESTED: 'FORGOT_PASSWORD_REQUESTED',
  OTP_SENT: 'OTP_SENT',
  OTP_VERIFIED: 'OTP_VERIFIED',
  WRONG_OTP_ATTEMPT: 'WRONG_OTP_ATTEMPT',
  OTP_EXPIRED: 'OTP_EXPIRED',
  PASSWORD_RESET_SUCCESS: 'PASSWORD_RESET_SUCCESS',
  PASSWORD_RESET_FAILED: 'PASSWORD_RESET_FAILED',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  ACCOUNT_NOT_FOUND_GENERIC: 'ACCOUNT_NOT_FOUND_GENERIC'
};

/**
 * Custom format to redact any sensitive key if accidentally included
 */
const redactSensitiveFormat = winston.format((info) => {
  const sensitiveKeys = ['otp', 'password', 'newPassword', 'confirmPassword', 'hashedOtp', 'secret'];
  
  const sanitize = (obj) => {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      if (sensitiveKeys.includes(key)) {
        clean[key] = '[REDACTED]';
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean[key] = sanitize(obj[key]);
      } else {
        clean[key] = obj[key];
      }
    }
    return clean;
  };

  return sanitize(info);
});

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    redactSensitiveFormat(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        redactSensitiveFormat(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, event, email, ip, ...meta }) => {
          const eventTag = event ? `[EVENT: ${event}]` : '';
          const emailTag = email ? `[EMAIL: ${email}]` : '';
          const ipTag = ip ? `[IP: ${ip}]` : '';
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}] ${eventTag} ${emailTag} ${ipTag} ${message} ${metaStr}`.trim();
        })
      )
    })
  ]
});

/**
 * Log a structured security audit event
 * @param {string} event - One of SECURITY_EVENTS
 * @param {object} details - Context info (e.g. email, ip, attemptsRemaining, reason)
 */
function logSecurityEvent(event, details = {}) {
  logger.info(`Security audit event: ${event}`, {
    event,
    timestamp: new Date().toISOString(),
    ...details
  });
}

module.exports = {
  logger,
  SECURITY_EVENTS,
  logSecurityEvent
};
