const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');
const { sendEmail, sendBccEmails, sendBatchEmails } = require('../utils/emailService');

/**
 * POST /api/email/send
 * Send a single email to one or more recipients.
 */
exports.sendSingle = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { to, bcc, subject, html, text, from, reply_to, scheduled_at } = req.body;

    Sentry.logger.info('Sending single email', {
      operation: 'sendSingleEmail',
      to,
      subject: subject?.slice(0, 60),
    });

    const result = bcc
      ? await sendBccEmails(bcc, {
          subject,
          html,
          text,
          from,
          reply_to,
          scheduled_at,
        })
      : await sendEmail({
          to,
          subject,
          html,
          text,
          from,
          reply_to,
          scheduled_at,
        });

    const duration = Date.now() - startTime;
    Sentry.logger.info('Single email sent', {
      operation: 'sendSingleEmail',
      messageId: result.data?.id,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: result.success !== false,
      message: 'Email sent successfully',
      messageId: result.data?.id,
      messageIds: result.results?.filter((item) => item.success && item.id).map((item) => item.id),
      total: result.total,
      chunkCount: result.chunkCount,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      results: result.results,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'sendSingleEmail' },
      extra: { body: { ...req.body, to: req.body?.to } },
    });
    return next(err);
  }
};

/**
 * POST /api/email/batch
 * Send multiple emails (up to 100) in one API call.
 */
exports.sendBatch = async (req, res, next) => {
  const startTime = Date.now();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { emails } = req.body;

    if (!Array.isArray(emails) || emails.length === 0) {
      const err = new Error('emails must be a non-empty array');
      err.statusCode = 400;
      throw err;
    }

    if (emails.length > 100) {
      const err = new Error('Batch size exceeds 100 emails');
      err.statusCode = 400;
      throw err;
    }

    Sentry.logger.info('Sending batch emails', {
      operation: 'sendBatchEmail',
      count: emails.length,
    });

    const result = await sendBatchEmails(emails);

    const duration = Date.now() - startTime;
    Sentry.logger.info('Batch emails sent', {
      operation: 'sendBatchEmail',
      count: result.sentCount,
      failedCount: result.failedCount,
      duration: `${duration}ms`,
    });

    return res.status(200).json({
      success: true,
      message: `${result.sentCount} of ${result.total} emails sent successfully${result.failedCount > 0 ? `, ${result.failedCount} failed` : ''}`,
      total: result.total,
      sentCount: result.sentCount,
      failedCount: result.failedCount,
      messageIds: result.results?.filter((d) => d.success && d.id).map((d) => d.id) || [],
      results: result.results,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { operation: 'sendBatchEmail' },
      extra: { count: req.body?.emails?.length },
    });
    return next(err);
  }
};