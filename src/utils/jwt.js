const jwt = require('jsonwebtoken');

// Read lazily so the secret is available regardless of module load order
// relative to dotenv.config() in app.js.
function getSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET environment variable is required.');
    }
    return secret;
}

/** The OTP JWT lifetime in seconds (defaults to 3600 = 1 hour). */
// Clamp non-positive/NaN to default 3600 to prevent issuing immediately expired tokens
const OTP_JWT_TTL = () => (Number(process.env.OTP_JWT_TTL) > 0 ? Number(process.env.OTP_JWT_TTL) : 3600);

/**
 * Sign a JWT for an email that has been verified via OTP.
 * The token proves the email passed OTP verification, so the
 * client can be treated as an authenticated (verified) session.
 */
function signOtpToken(email) {
    return jwt.sign({ email: email.toLowerCase() }, getSecret(), {
        algorithm: 'HS256',
        expiresIn: OTP_JWT_TTL(),
    });
}

/**
 * Verify a JWT and return its decoded payload.
 * Throws if the token is invalid, expired, or malformed.
 */
function verifyToken(token) {
    return jwt.verify(token, getSecret(), {
        algorithms: ['HS256'],
    });
}
module.exports = {
    signOtpToken,
    verifyToken,
    OTP_JWT_TTL,
};
