const rateLimit = require("express-rate-limit");
const Sentry = require("@sentry/node");

// Optional Redis store support
let RedisStore;
let RedisClient;
const redisUrl = process.env.REDIS_URL || process.env.REDIS_URI || null;
if (redisUrl) {
  try {
    // rate-limit-redis v2+ exports a function that accepts an object with a client
    // We'll try to load compatible packages if available
    // eslint-disable-next-line global-require
    const RateLimitRedis = require("rate-limit-redis");
    // eslint-disable-next-line global-require
    const IORedis = require("ioredis");
    RedisClient = new IORedis(redisUrl);
    RedisStore = RateLimitRedis;
  } catch (e) {
    // Do not fail if optional deps are missing; fall back to memory store
    if (Sentry && Sentry.logger && Sentry.logger.warn) {
      Sentry.logger.warn(
        "Redis not available for rate-limit store, falling back to memory store",
        { error: e.message }
      );
    }
    RedisStore = null;
    RedisClient = null;
  }
}

/**
 * Create an express-rate-limit middleware with sensible defaults and an informative handler.
 */
function createRateLimiter(opts = {}) {
  const windowMinutes =
    opts.windowMinutes ||
    parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) ||
    15;
  const max =
    typeof opts.max === "number"
      ? opts.max
      : parseInt(process.env.RATE_LIMIT_MAX, 10) || 100;
  const windowMs = windowMinutes * 60 * 1000;

  const store =
    RedisStore && RedisClient
      ? new RedisStore({ client: RedisClient, prefix: opts.keyPrefix || "rl:" })
      : undefined;

  return rateLimit({
    windowMs,
    max,
    store,
    standardHeaders: true, // RFC compliant `RateLimit-*` headers
    legacyHeaders: true, // `X-RateLimit-*` headers for compatibility
    handler: (req, res /*, next, options */) => {
      // Compute approximate reset time (epoch seconds)
      const resetEpoch = Math.floor((Date.now() + windowMs) / 1000);
      const retryAfter = Math.ceil(windowMs / 1000);

      // Log event to Sentry (non-blocking)
      try {
        Sentry &&
          Sentry.captureMessage &&
          Sentry.captureMessage("Rate limit exceeded", {
            level: "warning",
            extra: {
              ip: req.ip || req.connection.remoteAddress,
              method: req.method,
              url: req.originalUrl || req.url,
              windowMinutes,
              max,
            },
          });
      } catch (e) {
        // ignore logging errors
      }

      // Set helpful headers (some duplicates of express-rate-limit but explicit)
      res.set("Retry-After", String(retryAfter));
      res.set("X-RateLimit-Limit", String(max));
      res.set("X-RateLimit-Remaining", "0");
      res.set("X-RateLimit-Reset", String(resetEpoch));

      const message =
        process.env.NODE_ENV === "production"
          ? "Too many requests, please try again later."
          : `Rate limit exceeded (${max} requests per ${windowMinutes} minutes).`;

      res.status(429).json({
        success: false,
        error: "Too Many Requests",
        message,
        retryAfter,
      });
    },
  });
}

// Preconfigured limiters for common categories
const generalLimiter = createRateLimiter({
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
  max:
    parseInt(process.env.RATE_LIMIT_GENERAL_MAX, 10) ||
    parseInt(process.env.RATE_LIMIT_MAX, 10) ||
    100,
  keyPrefix: "general:",
});

const authLimiter = createRateLimiter({
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
  max: parseInt(process.env.RATE_LIMIT_AUTH_MAX, 10) || 5,
  keyPrefix: "auth:",
});

const publicLimiter = createRateLimiter({
  windowMinutes: parseInt(process.env.RATE_LIMIT_WINDOW_MINUTES, 10) || 15,
  max: parseInt(process.env.RATE_LIMIT_PUBLIC_MAX, 10) || 200,
  keyPrefix: "public:",
});

module.exports = {
  createRateLimiter,
  generalLimiter,
  authLimiter,
  publicLimiter,
};
