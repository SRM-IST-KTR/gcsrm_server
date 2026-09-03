const crypto = require('crypto');

const requireApiKey = (req, res, next) => {
  const serviceApiKey = process.env.SERVICE_API_KEY;

  if (!serviceApiKey) {
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

  const token = auth.slice(7).trim();
  const tokenBuffer = Buffer.from(token);
  const serviceApiKeyBuffer = Buffer.from(serviceApiKey);

  if (
    tokenBuffer.length !== serviceApiKeyBuffer.length ||
    !crypto.timingSafeEqual(tokenBuffer, serviceApiKeyBuffer)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid authentication token',
    });
  }

  return next();
};

module.exports = requireApiKey;
