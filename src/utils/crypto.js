const crypto = require('crypto');
const env = require('../config/env');

/**
 * Generates a cryptographically secure 6-digit numeric OTP.
 * @returns {string} 6-digit numeric string (e.g. "482910")
 */
function generateOTP() {
  const otpNumber = crypto.randomInt(100000, 1000000);
  return otpNumber.toString();
}

/**
 * Hashes a plaintext OTP using SHA-256 HMAC with secret salt.
 * @param {string} otp - Plaintext OTP
 * @returns {string} Hex encoded HMAC digest
 */
function hashOTP(otp) {
  if (!otp || typeof otp !== 'string') {
    throw new Error('Invalid OTP input for hashing');
  }
  return crypto
    .createHmac('sha256', env.OTP_SECRET_SALT)
    .update(otp)
    .digest('hex');
}

/**
 * Compares two OTP hashes in constant time to prevent timing attacks.
 * @param {string} hashA - First hex digest
 * @param {string} hashB - Second hex digest
 * @returns {boolean} True if hashes match exactly
 */
function verifyOTPHash(inputOtp, storedHashedOtp) {
  if (!inputOtp || !storedHashedOtp) return false;
  
  const inputHash = hashOTP(inputOtp);
  
  const bufferA = Buffer.from(inputHash, 'utf8');
  const bufferB = Buffer.from(storedHashedOtp, 'utf8');
  
  if (bufferA.length !== bufferB.length) {
    return false;
  }
  
  return crypto.timingSafeEqual(bufferA, bufferB);
}

module.exports = {
  generateOTP,
  hashOTP,
  verifyOTPHash
};
