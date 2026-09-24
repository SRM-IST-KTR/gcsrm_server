const crypto = require('crypto');

/**
 * Build an Express middleware that authenticates a request against a
 * static API key held in the named environment variable.
 *
 * @param {string} envVar name of the env var holding the expected key
 * @returns {import('express').RequestHandler}
 */
const createApiKeyGuard = (envVar) => (req, res, next) => {
  const expectedKey = process.env[envVar];

  if (!expectedKey) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
    });
  }

  const auth = req.headers['authorization'];
  if (!auth || typeof auth !== 'string' || !auth.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Missing or invalid Authorization Bearer header',
    });
  }

  const tokenBuffer = Buffer.from(auth.slice(7).trim());
  const expectedBuffer = Buffer.from(expectedKey);

  if (
    tokenBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, expectedBuffer)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid authentication token',
    });
  }

  return next();
};

module.exports = { createApiKeyGuard };
