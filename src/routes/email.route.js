const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const emailController = require('../controller/email.controller');
const requireApiKey = require('../middleware/requireApiKey');

/**
 * @swagger
 * tags:
 *   name: Email
 *   description: Send single or batch emails via Amazon SES
 */

/**
 * @swagger
 * /email/send:
 *   post:
 *     summary: Send a single email
 *     description: Sends one email to one or more recipients via Amazon SES.
 *     tags: [Email]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [to, subject]
 *             properties:
 *               to:
 *                 type: string
 *                 description: Recipient email address (or comma-separated list)
 *                 example: user@example.com
 *               subject:
 *                 type: string
 *                 description: Email subject line
 *                 example: Welcome to GitHub Community SRM
 *               html:
 *                 type: string
 *                 description: HTML body (optional if text provided)
 *                 example: "<h1>Welcome!</h1><p>Thank you for joining.</p>"
 *               text:
 *                 type: string
 *                 description: Plain text body (optional if html provided)
 *                 example: Welcome! Thank you for joining.
 *               from:
 *                 type: string
 *                 description: Sender override (defaults to SENDER_EMAIL env)
 *                 example: Team <team@githubsrmist.in>
 *               reply_to:
 *                 type: string
 *                 description: Reply-to address
 *                 example: support@githubsrmist.in
 *               scheduled_at:
 *                 type: string
 *                 format: date-time
 *                 description: ISO date to schedule the email for later
 *                 example: "2026-09-01T10:00:00Z"
 *     responses:
 *       200:
 *         description: Email sent successfully
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
 *                   example: Email sent successfully
 *                 messageId:
 *                   type: string
 *                   example: "e23a8b9c-1234-5678-9abc-def012345678"
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/send',
  requireApiKey,
  [
    body('to').notEmpty().withMessage('to is required'),
    body('subject').notEmpty().withMessage('subject is required'),
  ],
  emailController.sendSingle
);

/**
 * @swagger
 * /email/batch:
 *   post:
 *     summary: Send batch emails (up to 100)
 *     description: Sends multiple emails in batch via Amazon SES.
 *     tags: [Email]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *             type: object
 *             required: [emails]
 *             properties:
 *               emails:
 *                 type: array
 *                 description: Array of email objects (max 100)
 *                 items:
 *                   type: object
 *                   required: [to, subject]
 *                   properties:
 *                     to:
 *                       type: string
 *                       description: Recipient email
 *                       example: user1@example.com
 *                     subject:
 *                       type: string
 *                       description: Email subject
 *                       example: Hello from GC SRM
 *                     html:
 *                       type: string
 *                       description: HTML body
 *                       example: "<p>Hello from GC SRM!</p>"
 *                     text:
 *                       type: string
 *                       description: Plain text body
 *                       example: Hello from GC SRM!
 *                     from:
 *                       type: string
 *                       description: Per-email sender override
 *                       example: Team <team@githubsrmist.in>
 *                     reply_to:
 *                       type: string
 *                       description: Per-email reply-to
 *                       example: support@githubsrmist.in
 *                 example:
 *                   - to: user1@example.com
 *                     subject: Welcome
 *                     html: "<p>Welcome!</p>"
 *                   - to: user2@example.com
 *                     subject: Reminder
 *                     html: "<p>Reminder!</p>"
 *     responses:
 *       200:
 *         description: Batch emails sent
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
 *                   example: "2 emails sent successfully"
 *                 messageIds:
 *                   type: array
 *                   items:
 *                     type: string
 *                   example: ["e23a8b9c-...", "f45b6c7d-..."]
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       500:
 *         $ref: '#/components/responses/InternalServerError'
 */
router.post('/batch',
  requireApiKey,
  [
    body('emails').isArray({ min: 1, max: 100 }).withMessage('emails must be a non-empty array (max 100)'),
  ],
  emailController.sendBatch
);

module.exports = router;