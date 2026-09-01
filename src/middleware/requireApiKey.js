const requireApiKey = (req, res, next) => {
  const serviceApiKey = process.env.SERVICE_API_KEY;

  if (!serviceApiKey) {
    return res.status(500).json({
      success: false,
      message: 'Server configuration error: SERVICE_API_KEY is not set',
    });
  }

  const apiKey = req.headers['x-api-key'];

  if (!apiKey || apiKey !== serviceApiKey) {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized: Invalid or missing x-api-key header',
    });
  }

  next();
};

module.exports = requireApiKey;
