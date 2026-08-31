const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const otpController = require('../controller/otp.controller');

/**
 * @swagger
 * tags:
 *   name: OTP
 *   description: Email-based OTP verification (6-digit, 5-minute TTL via Redis)
 */

/**
 * @swagger
 * /otp/send:
 *   post:
 *     summary: Send an OTP to an email address
 *     description: Generates a 6-digit OTP, stores it in Redis with a 5-minute TTL, and emails it to the recipient.
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Recipient email address
 *                 example: user@example.com
 *               emailTemplate:
 *                 type: string
 *                 description: Optional custom HTML email template. Use {{otp}} as a placeholder for the generated OTP code. Falls back to the default template when omitted.
 *                 example: '<div>Your code is <strong>{{otp}}</strong></div>'
 *               subject:
 *                 type: string
 *                 description: Optional custom email subject line. Defaults to "Your OTP Code — GitHub Community SRM".
 *                 example: 'Your Verification Code'
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP sent successfully
 *                 expiresInSeconds:
 *                   type: integer
 *                   example: 300
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         description: Too many requests — OTP still valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: "An OTP was already sent. Please wait 60 seconds before requesting a new one."
 *                 retryAfterSeconds:
 *                   type: integer
 *                   example: 60
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/send',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('emailTemplate')
      .optional()
      .isString()
      .withMessage('emailTemplate must be a string'),
    body('subject')
      .optional()
      .isString()
      .withMessage('subject must be a string'),
  ],
  otpController.sendOTP
);

/**
 * @swagger
 * /otp/verify:
 *   post:
 *     summary: Verify an OTP
 *     description: Checks the provided 6-digit OTP against the stored value. One-time use — deleted after successful verification.
 *     tags: [OTP]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, otp]
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email the OTP was sent to
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 description: 6-digit OTP code
 *                 example: "483921"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: OTP verified successfully
 *       400:
 *         description: Invalid/expired OTP or validation error
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: Invalid or expired OTP
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/verify',
  [
    body('email').isEmail().withMessage('Valid email is required'),
    body('otp')
      .notEmpty().withMessage('OTP is required')
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be exactly 6 digits')
      .isNumeric().withMessage('OTP must be numeric'),
  ],
  otpController.verifyOTP
);

module.exports = router;