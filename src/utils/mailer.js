const nodemailer = require('nodemailer');

let transporter = global.__nodemailer_transporter;

if (!transporter) {
  const host = process.env.ZOHO_SMTP_HOST || 'smtp.zoho.in';
  const port = parseInt(process.env.ZOHO_SMTP_PORT || '465', 10);
  const secure = (process.env.ZOHO_SMTP_SECURE || 'true') === 'true';
  const user = process.env.ZOHO_SMTP_USER || process.env.SENDER_EMAIL || process.env.ZOHO_USER;
  const pass = process.env.ZOHO_SMTP_PASS || process.env.SENDER_PASS || process.env.ZOHO_PASS;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    ...(process.env.NODEMAILER_DEBUG === 'true' ? { logger: true, debug: true } : {}),
  });

  global.__nodemailer_transporter = transporter;
}

module.exports = transporter;
