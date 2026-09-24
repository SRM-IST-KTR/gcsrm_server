/**
 * Return a new object containing only the allowed keys present on the input.
 * Used to prevent mass assignment by building update payloads from an
 * explicit allowlist instead of trusting req.body.
 */
const pick = (obj, keys) => {
  const result = {};
  if (!obj || typeof obj !== 'object') return result;
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(obj, key) && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
};

/**
 * Escape a value for safe interpolation into an HTML string.
 */
const escapeHtml = (value) =>
  String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

module.exports = { pick, escapeHtml };
