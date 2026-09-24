const { createApiKeyGuard } = require('./apiKeyGuard');

/**
 * Admin / service guard. Protects every write operation and every
 * admin-only read (registrant lists, exports, analytics, email relay).
 * Clients authenticate with: `Authorization: Bearer <SERVICE_API_KEY>`
 */
const requireApiKey = createApiKeyGuard('SERVICE_API_KEY');

module.exports = requireApiKey;
