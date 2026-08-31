/**
 * OTP service — generate, store, verify 6-digit OTPs via Redis with TTL.
 */
const crypto = require('crypto');
const { getRedis } = require('./redis');

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_KEY_PREFIX = 'otp:';

/**
 * Generate a 6-digit numeric OTP.
 * Uses crypto.randomInt for cryptographically secure randomness.
 */
const generateOTP = () => {
  // 100000–999999 ensures exactly 6 digits
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Store an OTP for the given email in Redis with a TTL.
 * @param {string} email
 * @param {string} otp - 6-digit OTP
 */
const storeOTP = async (email, otp) => {
  const redis = getRedis();
  const key = `${OTP_KEY_PREFIX}${email.toLowerCase()}`;
  await redis.set(key, otp, 'EX', OTP_TTL_SECONDS);
};

/**
 * Verify an OTP for the given email.
 * - On success: deletes the key (one-time use) and returns true.
 * - On failure: returns false (wrong or expired).
 * @param {string} email
 * @param {string} otp - 6-digit code to check
 * @returns {Promise<boolean>}
 */
const verifyOTP = async (email, otp) => {
  const redis = getRedis();
  const key = `${OTP_KEY_PREFIX}${email.toLowerCase()}`;
  const stored = await redis.get(key);
  if (!stored) return false; // expired or never sent

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(stored);
  const actual = Buffer.from(otp);
  if (expected.length !== actual.length) return false;
  const match = crypto.timingSafeEqual(expected, actual);

  if (match) {
    // One-time use — delete after successful verification
    await redis.del(key);
  }
  return match;
};

/**
 * Get remaining TTL in seconds for an email's OTP (0 if none).
 * @param {string} email
 * @returns {Promise<number>}
 */
const getOTPTTL = async (email) => {
  const redis = getRedis();
  const key = `${OTP_KEY_PREFIX}${email.toLowerCase()}`;
  const ttl = await redis.ttl(key);
  return Math.max(0, ttl);
};

module.exports = { generateOTP, storeOTP, verifyOTP, getOTPTTL, OTP_TTL_SECONDS };