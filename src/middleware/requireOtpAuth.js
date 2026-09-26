const Sentry = require('@sentry/node');
const { verifyToken } = require('../utils/jwt');

/**
 * Validates the `Authorization: Bearer <jwt>` header prior to request body parsing.
 * Sets `req.otpUser = decoded` and `req.verifiedEmail = decoded.email`.
 * If SERVICE_API_KEY is supplied, sets `req.isServiceKey = true`.
 */
function requireOtpTokenHeader(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'OTP verification required. Please verify your email first.',
        });
    }

    // Allow admin/service key pass-through for administrative operations
    if (process.env.SERVICE_API_KEY && token === process.env.SERVICE_API_KEY) {
        req.isServiceKey = true;
        return next();
    }

    let decoded;
    try {
        decoded = verifyToken(token);
    } catch (err) {
        Sentry.captureException(err, {
            tags: { operation: 'requireOtpAuth', errorType: 'invalid_jwt' },
            extra: { path: req.originalUrl },
        });
        return res.status(401).json({
            success: false,
            message: 'Session expired or invalid. Please verify your email again.',
        });
    }

    req.otpUser = decoded;
    req.verifiedEmail = decoded.email;
    return next();
}

/**
 * Asserts that the email in the parsed request body matches the email in the verified OTP token.
 * Should run after body-parsing middleware (e.g., Multer or express.json).
 */
function verifyOtpEmailMatch(req, res, next) {
    if (req.isServiceKey) {
        return next();
    }

    const bodyEmail = String(req.body?.email || '').trim().toLowerCase();
    const tokenEmail = String(req.otpUser?.email || '').trim().toLowerCase();

    if (!bodyEmail || !tokenEmail || bodyEmail !== tokenEmail) {
        return res.status(403).json({
            success: false,
            message: 'Email does not match the verified session.',
        });
    }

    req.verifiedEmail = req.otpUser.email;
    return next();
}

/**
 * Combined middleware that protects JSON endpoints behind an OTP-verified session.
 */
function requireOtpAuth(req, res, next) {
    requireOtpTokenHeader(req, res, (err) => {
        if (err) return next(err);
        verifyOtpEmailMatch(req, res, next);
    });
}

module.exports = requireOtpAuth;
module.exports.requireOtpAuth = requireOtpAuth;
module.exports.requireOtpTokenHeader = requireOtpTokenHeader;
module.exports.verifyOtpEmailMatch = verifyOtpEmailMatch;
