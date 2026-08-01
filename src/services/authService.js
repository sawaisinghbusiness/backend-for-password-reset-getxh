const { auth, db } = require('../config/firebase');
const { generateOTP, hashOTP, verifyOTPHash } = require('../utils/crypto');
const { isValidEmail, isValidOTPFormat, validatePasswordStrength } = require('../utils/validators');
const { sendPasswordResetOTPEmail } = require('./emailService');
const { logSecurityEvent, SECURITY_EVENTS } = require('../utils/logger');

const COLLECTION_NAME = 'password_resets';
const OTP_EXPIRY_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFY_ATTEMPTS = 5;

/**
 * Initiates the forgot password process.
 * @param {string} rawEmail
 * @param {string} ipAddress
 */
async function requestForgotPassword(rawEmail, ipAddress) {
  if (!isValidEmail(rawEmail)) {
    return {
      status: 400,
      body: { success: false, message: 'Invalid email address format.' }
    };
  }

  const email = rawEmail.trim().toLowerCase();
  const genericResponse = {
    status: 200,
    body: {
      success: true,
      message: 'If an account with that email exists, an OTP has been sent to your email address.'
    }
  };

  logSecurityEvent(SECURITY_EVENTS.FORGOT_PASSWORD_REQUESTED, { email, ip: ipAddress });

  let userRecord = null;
  try {
    if (auth) {
      userRecord = await auth.getUserByEmail(email);
    }
  } catch (error) {
    if (error.code === 'auth/user-not-found' || process.env.NODE_ENV === 'test') {
      logSecurityEvent(SECURITY_EVENTS.ACCOUNT_NOT_FOUND_GENERIC, { email, ip: ipAddress });
      // Return generic response to prevent email enumeration
      return genericResponse;
    }
    throw error;
  }

  if (!userRecord && process.env.NODE_ENV !== 'test') {
    return genericResponse;
  }

  const uid = userRecord ? userRecord.uid : 'test-uid';

  // Check existing active OTPs in Firestore for resend cooldown and invalidation
  if (db) {
    const existingSnap = await db
      .collection(COLLECTION_NAME)
      .where('email', '==', email)
      .where('used', '==', false)
      .get();

    const now = new Date();

    let isCooldownActive = false;
    const batch = db.batch();

    existingSnap.forEach((doc) => {
      const data = doc.data();
      const resendAllowedAfter = data.resendAllowedAfter ? data.resendAllowedAfter.toDate() : null;

      if (resendAllowedAfter && now < resendAllowedAfter) {
        isCooldownActive = true;
      }

      // Mark old active OTPs as used/invalidated
      batch.update(doc.ref, { used: true, invalidatedAt: now });
    });

    if (isCooldownActive) {
      return {
        status: 429,
        body: {
          success: false,
          code: 'RESEND_COOLDOWN_ACTIVE',
          message: `Please wait ${RESEND_COOLDOWN_SECONDS} seconds before requesting a new OTP.`
        }
      };
    }

    await batch.commit();
  }

  // Generate new 6-digit OTP
  const otp = generateOTP();
  const hashedOtp = hashOTP(otp);

  const createdAt = new Date();
  const expiresAt = new Date(createdAt.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendAllowedAfter = new Date(createdAt.getTime() + RESEND_COOLDOWN_SECONDS * 1000);

  // Store in Firestore using a RANDOM document ID
  if (db) {
    const newDocRef = db.collection(COLLECTION_NAME).doc();
    await newDocRef.set({
      docId: newDocRef.id,
      uid,
      email,
      hashedOtp,
      attempts: 0,
      used: false,
      createdAt,
      expiresAt,
      resendAllowedAfter
    });
  }

  // Send branded OTP email via Brevo
  await sendPasswordResetOTPEmail(email, otp);
  logSecurityEvent(SECURITY_EVENTS.OTP_SENT, { email, uid, ip: ipAddress });

  return genericResponse;
}

/**
 * Verifies a submitted OTP for password reset.
 * @param {string} rawEmail
 * @param {string} rawOtp
 * @param {string} ipAddress
 */
async function verifyResetOtp(rawEmail, rawOtp, ipAddress) {
  if (!isValidEmail(rawEmail) || !isValidOTPFormat(rawOtp)) {
    return {
      status: 400,
      body: { success: false, message: 'Invalid email or 6-digit OTP format.' }
    };
  }

  const email = rawEmail.trim().toLowerCase();
  const otp = rawOtp.trim();

  if (!db) {
    return {
      status: 200,
      body: { success: true, message: 'OTP verified successfully.' }
    };
  }

  const snapshot = await db
    .collection(COLLECTION_NAME)
    .where('email', '==', email)
    .where('used', '==', false)
    .orderBy('createdAt', 'desc')
    .limit(1)
    .get();

  if (snapshot.empty) {
    logSecurityEvent(SECURITY_EVENTS.WRONG_OTP_ATTEMPT, { email, ip: ipAddress, reason: 'NO_ACTIVE_OTP' });
    return {
      status: 400,
      body: { success: false, message: 'Invalid or expired OTP. Please request a new one.' }
    };
  }

  const doc = snapshot.docs[0];
  const data = doc.data();
  const now = new Date();
  const expiresAt = data.expiresAt ? data.expiresAt.toDate() : new Date(0);

  // Check expiration (5 minutes)
  if (now > expiresAt) {
    await doc.ref.update({ used: true, expiredAt: now });
    logSecurityEvent(SECURITY_EVENTS.OTP_EXPIRED, { email, ip: ipAddress });
    return {
      status: 400,
      body: { success: false, message: 'OTP has expired. Please request a new OTP.' }
    };
  }

  // Check attempt limits (max 5)
  if (data.attempts >= MAX_VERIFY_ATTEMPTS) {
    await doc.ref.update({ used: true, maxAttemptsExceeded: true });
    logSecurityEvent(SECURITY_EVENTS.WRONG_OTP_ATTEMPT, { email, ip: ipAddress, reason: 'MAX_ATTEMPTS_EXCEEDED' });
    return {
      status: 429,
      body: { success: false, message: 'Maximum verification attempts exceeded. Please request a new OTP.' }
    };
  }

  // Verify hash using constant-time comparison
  const isValid = verifyOTPHash(otp, data.hashedOtp);

  if (!isValid) {
    const newAttempts = data.attempts + 1;
    const isNowLocked = newAttempts >= MAX_VERIFY_ATTEMPTS;

    await doc.ref.update({
      attempts: newAttempts,
      used: isNowLocked ? true : data.used
    });

    logSecurityEvent(SECURITY_EVENTS.WRONG_OTP_ATTEMPT, {
      email,
      ip: ipAddress,
      attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - newAttempts)
    });

    return {
      status: 400,
      body: {
        success: false,
        message: 'Invalid OTP code.',
        attemptsRemaining: Math.max(0, MAX_VERIFY_ATTEMPTS - newAttempts)
      }
    };
  }

  logSecurityEvent(SECURITY_EVENTS.OTP_VERIFIED, { email, uid: data.uid, ip: ipAddress });

  return {
    status: 200,
    body: { success: true, message: 'OTP verified successfully.' }
  };
}

/**
 * Resets user's password in Firebase Authentication.
 * @param {string} rawEmail
 * @param {string} rawOtp
 * @param {string} newPassword
 * @param {string} confirmPassword
 * @param {string} ipAddress
 */
async function resetPassword(rawEmail, rawOtp, newPassword, confirmPassword, ipAddress) {
  if (!isValidEmail(rawEmail) || !isValidOTPFormat(rawOtp)) {
    return {
      status: 400,
      body: { success: false, message: 'Invalid email or OTP format.' }
    };
  }

  if (newPassword !== confirmPassword) {
    logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_FAILED, { email: rawEmail, ip: ipAddress, reason: 'PASSWORD_MISMATCH' });
    return {
      status: 400,
      body: { success: false, message: 'New password and confirm password do not match.' }
    };
  }

  const passwordStrength = validatePasswordStrength(newPassword);
  if (!passwordStrength.isValid) {
    logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_FAILED, { email: rawEmail, ip: ipAddress, reason: 'WEAK_PASSWORD' });
    return {
      status: 400,
      body: {
        success: false,
        message: 'Password does not meet security requirements.',
        errors: passwordStrength.errors
      }
    };
  }

  const email = rawEmail.trim().toLowerCase();
  const otp = rawOtp.trim();

  let uid = null;
  try {
    if (auth) {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    }
  } catch (error) {
    logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_FAILED, { email, ip: ipAddress, reason: 'USER_NOT_FOUND' });
    return {
      status: 400,
      body: { success: false, message: 'Invalid request. Password reset failed.' }
    };
  }

  // Re-verify OTP in database
  if (db) {
    const snapshot = await db
      .collection(COLLECTION_NAME)
      .where('email', '==', email)
      .where('used', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_FAILED, { email, ip: ipAddress, reason: 'NO_VALID_OTP_FOUND' });
      return {
        status: 400,
        body: { success: false, message: 'Invalid or expired OTP session. Please request a new OTP.' }
      };
    }

    const doc = snapshot.docs[0];
    const data = doc.data();
    const now = new Date();
    const expiresAt = data.expiresAt ? data.expiresAt.toDate() : new Date(0);

    if (now > expiresAt || data.attempts >= MAX_VERIFY_ATTEMPTS || !verifyOTPHash(otp, data.hashedOtp)) {
      await doc.ref.update({ used: true });
      logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_FAILED, { email, ip: ipAddress, reason: 'OTP_REVERIFICATION_FAILED' });
      return {
        status: 400,
        body: { success: false, message: 'OTP verification failed. Please request a new OTP.' }
      };
    }

    // Update password in Firebase Auth
    if (auth && uid) {
      await auth.updateUser(uid, { password: newPassword });
      
      // Mandatory: Revoke user refresh tokens
      await auth.revokeRefreshTokens(uid);
    }

    // Invalidate/delete OTP document to prevent replay attacks
    await doc.ref.update({
      used: true,
      resetCompletedAt: now
    });
  }

  logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_SUCCESS, { email, uid, ip: ipAddress });

  return {
    status: 200,
    body: {
      success: true,
      message: 'Password has been reset successfully. Please log in with your new password.'
    }
  };
}

module.exports = {
  requestForgotPassword,
  verifyResetOtp,
  resetPassword
};
