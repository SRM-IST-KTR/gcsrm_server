const { createApiKeyGuard } = require('./apiKeyGuard');

/**
 * Public read guard. Protects display-only read endpoints that the
 * public-facing sites call (team, sponsors, events, certificate verify).
 * The key is safe to ship in a public bundle because these endpoints
 * never expose PII and can never mutate state.
 * Clients authenticate with: `Authorization: Bearer <PUBLIC_API_KEY>`
 */
const requirePublicKey = createApiKeyGuard('PUBLIC_API_KEY');

module.exports = requirePublicKey;
