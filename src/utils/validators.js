/**
 * Validates email format.
 * @param {string} email
 * @returns {boolean}
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Validates 6-digit numeric OTP format.
 * @param {string} otp
 * @returns {boolean}
 */
function isValidOTPFormat(otp) {
  if (!otp || typeof otp !== 'string') return false;
  return /^\d{6}$/.test(otp.trim());
}

/**
 * Validates password strength according to security standards.
 * Requirements:
 * - At least 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 * 
 * @param {string} password
 * @returns {{ isValid: boolean, errors: string[] }}
 */
function validatePasswordStrength(password) {
  const errors = [];

  if (!password || typeof password !== 'string') {
    return { isValid: false, errors: ['Password is required.'] };
  }

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters long.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

module.exports = {
  isValidEmail,
  isValidOTPFormat,
  validatePasswordStrength
};
