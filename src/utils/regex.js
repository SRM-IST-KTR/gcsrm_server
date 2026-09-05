/**
 * Escape user input for safe use inside a RegExp.
 * Prevents regex injection (ReDoS / pattern breakout) when building
 * case-insensitive exact-match or substring filters from query params.
 */
const escapeRegex = (input) =>
  String(input).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Client-safe error message: real message in dev, generic in production.
 */
const safeErrorMessage = (error, fallback = 'Internal Server Error') =>
  process.env.NODE_ENV === 'production' ? fallback : error?.message || fallback;

module.exports = { escapeRegex, safeErrorMessage };
