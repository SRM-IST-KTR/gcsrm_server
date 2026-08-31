const Sentry = require('@sentry/node');
const { verifyToken } = require('../utils/jwt');

/**
 * Middleware that protects endpoints behind an OTP-verified session.
 * Requires `Authorization: Bearer <jwt>` where the JWT was issued by
 * POST /api/otp/verify. Also enforces that the email in the request body
 * matches the email embedded in the token (anti-spam / anti-tamper).
 */
function requireOtpAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
        return res.status(401).json({
            success: false,
            message: 'OTP verification required. Please verify your email first.',
        });
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

    // The verified email from the token must match the email being acted upon.
    const bodyEmail = String(req.body?.email || '').trim().toLowerCase();
    if (!bodyEmail || bodyEmail !== String(decoded.email).toLowerCase()) {
        return res.status(403).json({
            success: false,
            message: 'Email does not match the verified session.',
        });
    }

    req.verifiedEmail = decoded.email;
    return next();
}

module.exports = requireOtpAuth;
