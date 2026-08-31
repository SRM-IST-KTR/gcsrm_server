/**
 * Unified email service — single library for all emailing in this codebase.
 *
 * Everything that sends email (contact forms, registrations, recruitments,
 * batch campaigns, …) MUST go through this module. It wraps the Resend SDK
 * (`resend`) — there is no nodemailer/smtp path anywhere.
 *
 * API:
 *   const { sendEmail, sendBatchEmails, getResend, isConfigured } = require('./emailService');
 *
 *   // Single email
 *   const result = await sendEmail({
 *     to: 'user@example.com',
 *     subject: 'Hi',
 *     html: '<p>…</p>',
 *     text: '…',            // optional
 *     from: 'Team <team@example.com>', // optional, defaults to SENDER_EMAIL
 *     reply_to: '…',        // optional
 *     scheduled_at: '…',    // optional ISO date
 *   });
 *
 *   // Batch email (multiple recipients in one API call, up to 100)
 *   const result = await sendBatchEmails([
 *     { to: 'a@example.com', subject: '…', html: '…' },
 *     { to: 'b@example.com', subject: '…', html: '…' },
 *   ]);
 *   // result.data is an array of { id } per email, in the same order as input.
 *
 * All functions throw on failure (never swallow); the returned object is
 * `{ success: true, data }` where `data` is the raw Resend response.
 */
const { Resend } = require('resend');

let resendInstance = null;
let initError = null;

/**
 * Lazy, cached Resend instance. Constructed on first use so that
 * `dotenv.config()` has already run when the key is read.
 */
const getResend = () => {
  if (resendInstance) return resendInstance;

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    initError = new Error(
      'Missing RESEND_API_KEY. Set it in your environment or .env file (e.g. RESEND_API_KEY=re_123)'
    );
    initError.code = 'RESEND_API_KEY_MISSING';
    throw initError;
  }

  resendInstance = new Resend(apiKey);
  return resendInstance;
};

/** True when an API key is present (does not construct the SDK). */
const isConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** Resolve the from-address: explicit option wins, else SENDER_EMAIL. */
const resolveFrom = (from) => from || process.env.SENDER_EMAIL;

/**
 * Normalize Resend errors into a consistent Error with a `cause` and status.
 */
const toError = (error, context) => {
  if (!error) return null;
  const err = new Error(
    `${context}: ${error.message || JSON.stringify(error)}`
  );
  err.code = error.name || 'RESEND_ERROR';
  err.statusCode = error.statusCode;
  err.cause = error;
  return err;
};

/**
 * Send a single email.
 * @param {Object} options - CreateEmailOptions + optional `from` override.
 * @returns {Promise<{success: true, data: {id: string}}>}
 * @throws {Error} on missing API key or Resend API failure.
 */
const sendEmail = async (options = {}) => {
  const resend = getResend();
  const email = {
    ...options,
    from: resolveFrom(options.from),
  };
  const { data, error } = await resend.emails.send(email);
  if (error) throw toError(error, 'Resend email send failed');
  return { success: true, data };
};

/**
 * Send multiple emails in a single batch API call (max 100 per Resend docs).
 * @param {Array<Object>} emails - Array of CreateBatchEmailOptions.
 * @returns {Promise<{success: true, data: {id: string}[]}>} - id per email, input order
 * @throws {Error} on missing API key or Resend API failure.
 */
const sendBatchEmails = async (emails = []) => {
  if (!Array.isArray(emails) || emails.length === 0) {
    throw new Error('sendBatchEmails: emails array must not be empty');
  }
  const resend = getResend();
  const payload = emails.map((e) => ({
    ...e,
    from: resolveFrom(e.from),
  }));
  const { data, error } = await resend.batch.send(payload);
  if (error) throw toError(error, 'Resend batch send failed');
  // The SDK wraps the batch payload as { data: { data: [{ id }, …] } };
  // normalize so `data` is always the id array itself.
  const ids = Array.isArray(data?.data) ? data.data : data;
  return { success: true, data: ids };
};

/**
 * Reset the cached instance (mainly for tests).
 */
const resetForTest = () => {
  resendInstance = null;
  initError = null;
};

module.exports = {
  getResend,
  isConfigured,
  sendEmail,
  sendBatchEmails,
  resetForTest,
};
