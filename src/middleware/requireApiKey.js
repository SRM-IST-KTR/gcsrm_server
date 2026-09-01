const crypto = require('crypto');

const requireApiKey = (req, res, next) => {
  const serviceApiKey = process.env.SERVICE_API_KEY;

  if (!serviceApiKey) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error',
    });
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing x-api-key header',
    });
  }

  const apiKeyBuffer = Buffer.from(apiKey);
  const serviceApiKeyBuffer = Buffer.from(serviceApiKey);

  if (
    apiKeyBuffer.length !== serviceApiKeyBuffer.length ||
    !crypto.timingSafeEqual(apiKeyBuffer, serviceApiKeyBuffer)
  ) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing x-api-key header',
    });
  }

  return next();
};

module.exports = requireApiKey;
