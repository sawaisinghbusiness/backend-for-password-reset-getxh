const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

/**
 * Validates mandatory environment variables.
 * Falls back to reasonable defaults for optional values in non-production.
 */
function validateEnv() {
  const isProduction = process.env.NODE_ENV === 'production';

  const requiredVars = ['OTP_SECRET_SALT'];
  
  if (isProduction) {
    requiredVars.push('BREVO_API_KEY');
  }

  const missing = requiredVars.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.warn(`[WARNING] Missing environment variables: ${missing.join(', ')}.`);
  }

  return {
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    OTP_SECRET_SALT: process.env.OTP_SECRET_SALT || 'default_dev_otp_secret_salt_32chars_min',
    FIREBASE_SERVICE_ACCOUNT_PATH: process.env.FIREBASE_SERVICE_ACCOUNT_PATH
      ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
      : null,
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY
      ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
      : null,
    BREVO_API_KEY: process.env.BREVO_API_KEY || 'MOCK_BREVO_KEY',
    BREVO_SENDER_EMAIL: process.env.BREVO_SENDER_EMAIL || 'agency@getxh.in',
    BREVO_SENDER_NAME: process.env.BREVO_SENDER_NAME || 'GETXH Security',
    FORGOT_PASSWORD_LIMIT_MAX: parseInt(process.env.FORGOT_PASSWORD_LIMIT_MAX || '30', 10),
    VERIFY_OTP_LIMIT_MAX: parseInt(process.env.VERIFY_OTP_LIMIT_MAX || '50', 10),
    RESET_PASSWORD_LIMIT_MAX: parseInt(process.env.RESET_PASSWORD_LIMIT_MAX || '50', 10),
    RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10) // 15 minutes
  };
}

module.exports = validateEnv();
