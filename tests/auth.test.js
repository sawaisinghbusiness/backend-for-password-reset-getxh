process.env.NODE_ENV = 'test';
process.env.OTP_SECRET_SALT = 'test_secret_salt_32chars_min_len_key';

const request = require('supertest');
const app = require('../src/app');
const { generateOTP, hashOTP, verifyOTPHash } = require('../src/utils/crypto');
const { validatePasswordStrength, isValidEmail, isValidOTPFormat } = require('../src/utils/validators');

describe('GETXH Password Reset Backend Service Unit & Integration Tests', () => {
  
  describe('Crypto Utilities', () => {
    test('generateOTP should return a 6-digit numeric string', () => {
      const otp = generateOTP();
      expect(otp).toMatch(/^\d{6}$/);
    });

    test('hashOTP should return consistent SHA-256 HMAC hash', () => {
      const otp = '123456';
      const hash1 = hashOTP(otp);
      const hash2 = hashOTP(otp);
      expect(hash1).toBe(hash2);
      expect(hash1.length).toBe(64); // SHA-256 hex string length
    });

    test('verifyOTPHash should correctly verify valid OTP and reject invalid OTP', () => {
      const otp = '654321';
      const hash = hashOTP(otp);
      expect(verifyOTPHash('654321', hash)).toBe(true);
      expect(verifyOTPHash('000000', hash)).toBe(false);
      expect(verifyOTPHash('', hash)).toBe(false);
    });
  });

  describe('Validators', () => {
    test('isValidEmail should accurately validate emails', () => {
      expect(isValidEmail('user@getxh.in')).toBe(true);
      expect(isValidEmail('invalid-email')).toBe(false);
      expect(isValidEmail('')).toBe(false);
    });

    test('isValidOTPFormat should check 6-digit numbers', () => {
      expect(isValidOTPFormat('123456')).toBe(true);
      expect(isValidOTPFormat('12345')).toBe(false);
      expect(isValidOTPFormat('1234567')).toBe(false);
      expect(isValidOTPFormat('abc123')).toBe(false);
    });

    test('validatePasswordStrength should enforce strong password rules', () => {
      expect(validatePasswordStrength('Weak1!').isValid).toBe(false); // too short
      expect(validatePasswordStrength('alllowercase1!').isValid).toBe(false); // no uppercase
      expect(validatePasswordStrength('ALLUPPERCASE1!').isValid).toBe(false); // no lowercase
      expect(validatePasswordStrength('NoSpecialNum1').isValid).toBe(false); // no special char
      expect(validatePasswordStrength('StrongP@ssw0rd!').isValid).toBe(true);
    });
  });

  describe('API Endpoints (Integration)', () => {
    test('GET /health should return UP status', async () => {
      const res = await request(app).get('/health');
      expect(res.statusCode).toEqual(200);
      expect(res.body.status).toEqual('UP');
    });

    test('POST /api/forgot-password with invalid email format should fail with 400', async () => {
      const res = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'bad-email-format' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    test('POST /api/forgot-password with valid email format should return generic success message', async () => {
      const res = await request(app)
        .post('/api/forgot-password')
        .send({ email: 'testuser@getxh.in' });
      
      expect(res.statusCode).toEqual(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toContain('If an account with that email exists');
    });

    test('POST /api/verify-reset-otp with invalid OTP format should fail with 400', async () => {
      const res = await request(app)
        .post('/api/verify-reset-otp')
        .send({ email: 'testuser@getxh.in', otp: '123' });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });

    test('POST /api/reset-password with mismatched passwords should return 400', async () => {
      const res = await request(app)
        .post('/api/reset-password')
        .send({
          email: 'testuser@getxh.in',
          otp: '123456',
          newPassword: 'StrongPassword1!',
          confirmPassword: 'DifferentPassword1!'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('do not match');
    });

    test('POST /api/reset-password with weak password should return 400', async () => {
      const res = await request(app)
        .post('/api/reset-password')
        .send({
          email: 'testuser@getxh.in',
          otp: '123456',
          newPassword: 'weak',
          confirmPassword: 'weak'
        });
      
      expect(res.statusCode).toEqual(400);
      expect(res.body.success).toBe(false);
    });
  });
});
