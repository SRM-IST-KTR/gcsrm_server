/**
 * OTP service — generate, store, verify 6-digit OTPs via Redis with TTL.
 */
const crypto = require('crypto');
const { getRedis } = require('./redis');

const OTP_TTL_SECONDS = 300; // 5 minutes
const OTP_KEY_PREFIX = 'otp:';
const OTP_ATTEMPT_KEY_PREFIX = 'otp:attempts:';
const OTP_MAX_ATTEMPTS = 5;

/**
 * Generate a 6-digit numeric OTP.
 * Uses crypto.randomInt for cryptographically secure randomness.
 */
const generateOTP = () => {
  // 100000–999999 ensures exactly 6 digits
  return crypto.randomInt(100000, 999999).toString();
};

const attemptKey = (email) => `${OTP_ATTEMPT_KEY_PREFIX}${email.toLowerCase()}`;

/**
 * Store an OTP for the given email in Redis with a TTL.
 * Also resets the failed-attempt counter for a fresh challenge.
 * @param {string} email
 * @param {string} otp - 6-digit OTP
 */
const storeOTP = async (email, otp) => {
  const redis = getRedis();
  const key = `${OTP_KEY_PREFIX}${email.toLowerCase()}`;
  await redis.set(key, otp, 'EX', OTP_TTL_SECONDS);
  await redis.del(attemptKey(email));
};

/**
 * Verify an OTP for the given email.
 * - On success: deletes the key (one-time use) and returns true.
 * - On failure: records a failed attempt (used for brute-force lockout).
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
  const actual = Buffer.from(String(otp));
  const match =
    expected.length === actual.length && crypto.timingSafeEqual(expected, actual);

  if (match) {
    // One-time use — delete the code and reset the attempt counter
    await redis.del(key);
    await redis.del(attemptKey(email));
    return true;
  }

  // Wrong code: count the failure and destroy the OTP once the limit is hit
  const attempts = await redis.incr(attemptKey(email));
  if (attempts === 1) {
    await redis.expire(attemptKey(email), OTP_TTL_SECONDS);
  }
  if (attempts >= OTP_MAX_ATTEMPTS) {
    await redis.del(key);
  }
  return false;
};

/**
 * Number of failed verification attempts recorded for an email.
 * @param {string} email
 * @returns {Promise<number>}
 */
const getFailedAttempts = async (email) => {
  const redis = getRedis();
  const attempts = await redis.get(attemptKey(email));
  return attempts ? parseInt(attempts, 10) : 0;
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

module.exports = {
  generateOTP,
  storeOTP,
  verifyOTP,
  getOTPTTL,
  getFailedAttempts,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
};
