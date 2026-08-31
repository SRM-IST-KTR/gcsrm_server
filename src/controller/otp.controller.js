const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');
const { generateOTP, storeOTP, verifyOTP, getOTPTTL, OTP_TTL_SECONDS } = require('../utils/otpService');
const { sendEmail } = require('../utils/emailService');
const { signOtpToken, OTP_JWT_TTL } = require('../utils/jwt');

/**
 * POST /api/otp/send
 * Generate a 6-digit OTP, store it in Redis with a 5-minute TTL, and email it.
 * Accepts optional `emailTemplate` (HTML string with {{otp}} placeholder) and `subject` override.
 */
exports.sendOTP = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, emailTemplate, subject } = req.body;

    // Check if there's already a valid OTP that hasn't expired
    const remaining = await getOTPTTL(email);
    if (remaining > 180) {
      // OTP still valid with >3 min left — refuse to send a new one
      return res.status(429).json({
        success: false,
        message: `An OTP was already sent. Please wait ${Math.ceil(remaining - 180)} seconds before requesting a new one.`,
        retryAfterSeconds: remaining - 180,
      });
    }

    const otp = generateOTP();
    await storeOTP(email, otp);

    // Resolve HTML: use custom template if provided (replacing {{otp}}), else default
    const html = emailTemplate
      ? emailTemplate.replace(/\{\{otp\}\}/g, otp)
      : `
      <!doctype html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: -apple-system, sans-serif; background:#f6f8fa;">
        <div style="max-width:480px;margin:40px auto;background:#fff;border:1px solid #d0d7de;border-radius:8px;padding:32px;">
          <h2 style="margin:0 0 8px;color:#24292f;">Your OTP Code</h2>
          <p style="color:#656d76;font-size:14px;margin:0 0 24px;">Use this code to complete your verification. It expires in 5 minutes.</p>
          <div style="background:#f6f8fa;border:1px solid #d0d7de;border-radius:6px;padding:16px;text-align:center;letter-spacing:8px;font-size:32px;font-weight:700;color:#24292f;">${otp}</div>
          <p style="color:#656d76;font-size:12px;margin-top:24px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      </body>
      </html>
    `;

    const { data } = await sendEmail({
      to: email,
      subject: subject || 'Your OTP Code — GitHub Community SRM',
      html,
      text: `Your OTP code is: ${otp}\n\nIt expires in 5 minutes.\n\nIf you didn't request this, please ignore this email.`,
    });

    const duration = Date.now() - startTime;
    Sentry.logger.info('OTP sent', {
      operation: 'sendOTP',
      email,
      hasCustomTemplate: Boolean(emailTemplate),
      subject: subject || 'default',
      messageId: data?.id,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresInSeconds: OTP_TTL_SECONDS,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'sendOTP' },
      extra: { email: req.body?.email },
    });
    return next(err);
  }
};

/**
 * POST /api/otp/verify
 * Verify a 6-digit OTP for the given email. One-time use.
 */
exports.verifyOTP = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, otp } = req.body;

    const isValid = await verifyOTP(email, otp);

    const duration = Date.now() - startTime;
    Sentry.logger.info('OTP verify attempt', {
      operation: 'verifyOTP',
      email,
      success: isValid,
      duration: `${duration}ms`,
    });

    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP',
      });
    }

    // Issue a JWT so the client carries a verified session without re-verifying OTP.
    const token = signOtpToken(email);

    return res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      token,
      expiresInSeconds: OTP_JWT_TTL(),
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'verifyOTP' },
      extra: { email: req.body?.email },
    });
    return next(err);
  }
};