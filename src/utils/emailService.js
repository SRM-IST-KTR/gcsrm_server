const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');

let sesClientInstance = null;

const getSES = () => {
  if (sesClientInstance) return sesClientInstance;

  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';

  const credentials =
    process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID.trim(),
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY.trim(),
          ...(process.env.AWS_SESSION_TOKEN && {
            sessionToken: process.env.AWS_SESSION_TOKEN.trim(),
          }),
        }
      : undefined;

  sesClientInstance = new SESClient({
    region,
    credentials,
    maxAttempts: 3,
  });

  return sesClientInstance;
};

const isConfigured = () =>
  Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_REGION ||
      process.env.AWS_PROFILE ||
      process.env.SENDER_EMAIL
  );

const resolveFrom = (from) => from || process.env.SENDER_EMAIL || 'noreply@githubsrmist.in';

const normalizeAddresses = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) {
    return input.map((addr) => String(addr).trim()).filter(Boolean);
  }
  if (typeof input === 'string') {
    return input
      .split(',')
      .map((addr) => addr.trim())
      .filter(Boolean);
  }
  return [];
};

const toError = (error, context) => {
  if (!error) return null;

  const message = error.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
  const err = new Error(`${context}: ${message}`);

  err.name = error.name || 'SESError';
  err.code = error.name || error.Code || 'SES_ERROR';
  err.statusCode = error.$metadata?.httpStatusCode || error.statusCode || 500;
  err.cause = error;

  return err;
};

const buildSendEmailParams = (options = {}) => {
  const toAddresses = normalizeAddresses(options.to);
  const ccAddresses = normalizeAddresses(options.cc);
  const bccAddresses = normalizeAddresses(options.bcc);

  if (toAddresses.length === 0 && ccAddresses.length === 0 && bccAddresses.length === 0) {
    const err = new Error('At least one email recipient is required in "to", "cc", or "bcc".');
    err.statusCode = 400;
    err.code = 'INVALID_RECIPIENT';
    throw err;
  }

  if (!options.subject || typeof options.subject !== 'string' || options.subject.trim() === '') {
    const err = new Error('Email "subject" is required and must not be empty.');
    err.statusCode = 400;
    err.code = 'INVALID_SUBJECT';
    throw err;
  }

  const hasHtml = Boolean(options.html && typeof options.html === 'string' && options.html.trim() !== '');
  const hasText = Boolean(options.text && typeof options.text === 'string' && options.text.trim() !== '');

  if (!hasHtml && !hasText) {
    const err = new Error('Email body requires at least "html" or "text" content.');
    err.statusCode = 400;
    err.code = 'INVALID_BODY';
    throw err;
  }

  const replyToAddresses = normalizeAddresses(options.reply_to || options.replyTo);

  const configurationSet =
    options.configuration_set ||
    options.configurationSet ||
    process.env.AWS_SES_CONFIGURATION_SET ||
    'gcsrm-events';

  return {
    Source: resolveFrom(options.from),
    Destination: {
      ...(toAddresses.length > 0 && { ToAddresses: toAddresses }),
      ...(ccAddresses.length > 0 && { CcAddresses: ccAddresses }),
      ...(bccAddresses.length > 0 && { BccAddresses: bccAddresses }),
    },
    Message: {
      Subject: {
        Charset: 'UTF-8',
        Data: options.subject,
      },
      Body: {
        ...(hasHtml && {
          Html: {
            Charset: 'UTF-8',
            Data: options.html,
          },
        }),
        ...(hasText && {
          Text: {
            Charset: 'UTF-8',
            Data: options.text,
          },
        }),
      },
    },
    ...(replyToAddresses.length > 0 && { ReplyToAddresses: replyToAddresses }),
    ...(configurationSet && { ConfigurationSetName: configurationSet }),
  };
};

const sendEmail = async (options = {}) => {
  try {
    const ses = getSES();
    const params = buildSendEmailParams(options);
    const command = new SendEmailCommand(params);
    const response = await ses.send(command);

    return {
      success: true,
      data: {
        id: response.MessageId,
      },
    };
  } catch (error) {
    if (error.statusCode === 400 && error.code?.startsWith('INVALID_')) {
      throw error;
    }
    throw toError(error, 'SES single email send failed');
  }
};

const mapConcurrent = async (items, concurrency, fn) => {
  const results = new Array(items.length);
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      results[index] = await fn(items[index], index);
    }
  };

  const pool = Array.from(
    { length: Math.min(concurrency, items.length) },
    () => worker()
  );

  await Promise.all(pool);
  return results;
};

const sendBccEmails = async (recipients = [], emailOptions = {}) => {
  const bccAddresses = normalizeAddresses(recipients);
  if (bccAddresses.length === 0) {
    const err = new Error('sendBccEmails: recipients must be a non-empty array');
    err.statusCode = 400;
    throw err;
  }

  const chunkSize = 49;
  const chunks = Array.from(
    { length: Math.ceil(bccAddresses.length / chunkSize) },
    (_, index) => bccAddresses.slice(index * chunkSize, (index + 1) * chunkSize)
  );

  const concurrency =
    emailOptions.concurrency ||
    parseInt(process.env.SES_BATCH_CONCURRENCY, 10) ||
    10;

  const results = await mapConcurrent(chunks, concurrency, async (chunk, index) => {
    try {
      const response = await sendEmail({
        ...emailOptions,
        bcc: chunk,
        to: undefined,
        concurrency: undefined,
      });

      return {
        recipients: chunk,
        success: true,
        id: response.data?.id,
        index,
      };
    } catch (error) {
      return {
        recipients: chunk,
        success: false,
        error: error.message || String(error),
        index,
      };
    }
  });

  const sentCount = results.reduce((count, result) => (
    result.success ? count + result.recipients.length : count
  ), 0);
  const failedCount = bccAddresses.length - sentCount;

  return {
    success: sentCount > 0,
    total: bccAddresses.length,
    chunkCount: chunks.length,
    sentCount,
    failedCount,
    results,
    data: results,
  };
};

const sendBatchEmails = async (emails = [], batchOptions = {}) => {
  if (!Array.isArray(emails) || emails.length === 0) {
    const err = new Error('sendBatchEmails: emails must be a non-empty array');
    err.statusCode = 400;
    throw err;
  }

  const concurrency =
    batchOptions.concurrency ||
    parseInt(process.env.SES_BATCH_CONCURRENCY, 10) ||
    10;

  try {
    const results = await mapConcurrent(emails, concurrency, async (emailOptions, idx) => {
      const recipient = emailOptions?.to;
      try {
        const res = await sendEmail(emailOptions);
        return {
          to: recipient,
          success: true,
          id: res.data?.id,
          index: idx,
        };
      } catch (err) {
        return {
          to: recipient,
          success: false,
          error: err.message || String(err),
          index: idx,
        };
      }
    });

    const sentCount = results.filter((r) => r.success).length;
    const failedCount = results.length - sentCount;

    return {
      success: sentCount > 0 || emails.length === 0,
      total: emails.length,
      sentCount,
      failedCount,
      results,
      data: results,
    };
  } catch (error) {
    throw toError(error, 'SES batch email send failed');
  }
};

const resetForTest = () => {
  sesClientInstance = null;
};

module.exports = {
  getSES,
  getResend: getSES,
  isConfigured,
  sendEmail,
  sendBccEmails,
  sendBatchEmails,
  resetForTest,
};
