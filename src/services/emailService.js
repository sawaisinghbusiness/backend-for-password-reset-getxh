const { apiInstance, Brevo } = require('../config/brevo');
const env = require('../config/env');
const { getForgotPasswordEmailTemplate } = require('../templates/emailTemplates');
const { logger } = require('../utils/logger');

/**
 * Sends a transactional password reset OTP email via Brevo.
 * @param {string} recipientEmail - User's email address
 * @param {string} otp - 6-digit OTP
 * @returns {Promise<boolean>} True if sent successfully
 */
async function sendPasswordResetOTPEmail(recipientEmail, otp) {
  const { html, text } = getForgotPasswordEmailTemplate(otp, 5);

  const sendSmtpEmail = new Brevo.SendSmtpEmail();
  sendSmtpEmail.subject = 'GETXH - Password Reset Verification Code';
  sendSmtpEmail.htmlContent = html;
  sendSmtpEmail.textContent = text;
  sendSmtpEmail.sender = {
    name: env.BREVO_SENDER_NAME,
    email: env.BREVO_SENDER_EMAIL
  };
  sendSmtpEmail.to = [{ email: recipientEmail }];

  if (env.BREVO_API_KEY === 'MOCK_BREVO_KEY' || env.NODE_ENV === 'test') {
    logger.info(`[MOCK EMAIL] OTP email simulated for ${recipientEmail}. OTP: [REDACTED]`);
    return true;
  }

  try {
    const data = await apiInstance.sendTransacEmail(sendSmtpEmail);
    logger.info(`Brevo email dispatched successfully to ${recipientEmail}`, { messageId: data.body ? data.body.messageId : data.messageId });
    return true;
  } catch (error) {
    logger.error('Failed to send email via Brevo API:', {
      email: recipientEmail,
      error: error.response ? error.response.body : error.message
    });
    throw new Error('Failed to send password reset email. Please try again later.');
  }
}

module.exports = {
  sendPasswordResetOTPEmail
};
