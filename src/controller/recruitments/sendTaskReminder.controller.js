const mongoose = require('mongoose');
const { connectRecruitmentDB } = require('../../utils/db');
const getParticipantUserModel = require('../../models/recruitment.model');
const { validationResult } = require('express-validator');
const Sentry = require('@sentry/node');
const { safeErrorMessage } = require('../../utils/regex');

/**
 * POST /api/recruitment/send-task-reminder
 *
 * Send the task submission reminder email to a list of candidate ids
 * without changing their status. Uses the task-reminder template
 * (derived from the task-assigned mail).
 */
const sendTaskReminderEmails = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { ids } = req.body;
    const dbConn = await connectRecruitmentDB();
    const ParticipantUser = getParticipantUserModel(dbConn);

    const { sendTaskReminderEmail } = require('../../utils/email/recruitment');
    const participants = await ParticipantUser.find({ _id: { $in: ids } });

    let emailsSent = 0;
    let emailErrors = 0;
    const failedRecipients = [];

    for (const p of participants) {
      if (!p.email) {
        emailErrors++;
        continue;
      }
      const emailRes = await sendTaskReminderEmail(p);
      if (emailRes.success) {
        emailsSent++;
      } else {
        emailErrors++;
        failedRecipients.push({ email: p.email, error: emailRes.error });
      }
    }

    if (emailsSent === 0 && emailErrors > 0) {
      return res.status(502).json({
        success: false,
        message: `Failed to send any reminder emails (${emailErrors} errors)`,
        emailsSent,
        emailErrors,
        failedRecipients,
      });
    }

    return res.status(200).json({
      success: true,
      message: `Successfully sent ${emailsSent} task submission reminder email(s)${emailErrors > 0 ? `, ${emailErrors} failed` : ''}`,
      emailsSent,
      emailErrors,
      failedRecipients,
    });
  } catch (error) {
    Sentry.captureException(error);
    console.error('Error sending task reminder emails:', error);
    return res.status(500).json({
      success: false,
      error: safeErrorMessage(error, 'Failed to send task reminder emails'),
    });
  }
};

module.exports = { sendTaskReminderEmails };
