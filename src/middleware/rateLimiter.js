const rateLimit = require('express-rate-limit');

/**
 * General rate limiter for recruitment routes.
 * Limits each IP to 100 requests per 15 minutes.
 */
const recruitmentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again after 15 minutes',
  },
});

/**
 * Stricter rate limiter for sensitive batch/bulk recruitment actions.
 * Limits each IP to 30 requests per 15 minutes.
 */
const batchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many batch requests from this IP, please try again after 15 minutes',
  },
});

module.exports = {
  recruitmentLimiter,
  batchLimiter,
};
