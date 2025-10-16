const nodemailer = require('nodemailer');
const { validationResult } = require('express-validator');

exports.sendContact = async (req, res, next) => {
  // Basic validation
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }


    const { name, email, message } = req.body;

    // Compose recipients and from addresses
    const adminEmail = process.env.RECIPIENT_EMAIL || process.env.CONTACT_ADMIN_EMAIL || 'community@githubsrmist.in';
    const fromEmail = process.env.SENDER_EMAIL || process.env.CONTACT_FROM_EMAIL || process.env.ZOHO_SMTP_USER;

    // Email templates
    const createEmailTemplate = (nameVal, emailVal, query) => {
        const currentDate = new Date().toLocaleString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata'
        });
        return `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; background-color:#f6f8fa;">` +
            `<div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #d0d7de;border-radius:6px;overflow:hidden;">` +
            `<div style="background:#24292f;padding:24px;color:#fff;text-align:center;"><h1 style="margin:0;font-size:20px;">New Contact Form Submission</h1><p style="color:#7d8590;margin:8px 0 0 0;font-size:14px;">GitHub Community SRM • ${currentDate} (IST)</p></div>` +
            `<div style="padding:24px;"><div style="background:#f6f8fa;padding:16px;border:1px solid #d0d7de;border-radius:6px;margin-bottom:16px;"><h2 style="margin:0 0 12px 0;font-size:16px;">Contact Information</h2><table style="width:100%;border-collapse:collapse;"><tr><td style="padding:6px 0;font-weight:600;color:#656d76;width:60px;vertical-align:top;">Name:</td><td style="padding:6px 0;color:#24292f;">${nameVal}</td></tr><tr><td style="padding:6px 0;font-weight:600;color:#656d76;vertical-align:top;">Email:</td><td style="padding:6px 0;"><a href="mailto:${emailVal}" style="color:#0969da;text-decoration:none;">${emailVal}</a></td></tr></table></div>` +
            `<div style="background:#fff;padding:16px;border:1px solid #d0d7de;border-radius:6px;margin-bottom:16px;"><h2 style="margin:0 0 12px 0;font-size:16px;">Message</h2><div style="background:#f6f8fa;padding:12px;border-radius:6px;border-left:3px solid #0969da;"><p style="margin:0;color:#24292f;font-size:14px;white-space:pre-wrap;">${query}</p></div></div></div>` +
            `<div style="background:#f6f8fa;padding:16px;border-top:1px solid #d0d7de;text-align:center;"><p style="color:#656d76;margin:0;font-size:12px;">This email was automatically generated from the GitHub Community SRM contact form.</p></div></div></body></html>`;
    };

    const createConfirmationTemplate = (nameVal) => {
        return `<!doctype html><html><head><meta charset="utf-8"></head><body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif; background-color:#f6f8fa;"><div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #d0d7de;border-radius:6px;overflow:hidden;"><div style="background:#24292f;padding:24px;color:#fff;text-align:center;"><h1 style="margin:0;font-size:20px;">GitHub Community SRM</h1><p style="color:#7d8590;margin:4px 0 0 0;font-size:14px;">Message received successfully</p></div><div style="padding:32px 24px;"><h2 style="color:#24292f;margin:0 0 16px 0;font-size:20px;">Hello ${nameVal},</h2><p style="color:#656d76;font-size:16px;line-height:1.5;margin-bottom:24px;">Thank you for reaching out to <strong>GitHub Community SRM</strong>. We have received your message and our team will respond within <strong>24-48 hours</strong>.</p></div><div style="background:#f6f8fa;padding:24px;border-top:1px solid #d0d7de;text-align:center;"><p style="color:#656d76;margin:0;font-size:12px;">© 2025 GitHub Community SRM. All rights reserved.</p></div></div></body></html>`;
    };

  // Send team email + confirmation to sender using cached transporter
  const transporter = require('../utils/mailer');

    const teamMailOptions = {
      from: fromEmail,
      to: adminEmail,
      replyTo: email,
      subject: `🔔 New Contact Form Submission from ${name}`,
      html: createEmailTemplate(name, email, message),
      text: `New Contact Form Submission\n\nFrom: ${name} (${email})\n\nMessage:\n${message}\n\nReply to this person: ${email}`,
    };

    const confirmationMailOptions = {
      from: fromEmail,
      to: email,
      subject: `✅ Thank you for contacting GitHub Community SRM`,
      html: createConfirmationTemplate(name),
      text: `Hi ${name}!\n\nThank you for reaching out to GitHub Community SRM! We've received your message and our team will get back to you within 24-48 hours.\n\nBest regards,\nGitHub Community SRM Team`,
    };

    // Send emails synchronously (await) to guarantee delivery attempt before responding
    try {
      const transporter = require('../utils/mailer');
      const sendStart = Date.now();
      console.log('[contact] sending emails...');
      await Promise.all([
        transporter.sendMail(teamMailOptions),
        transporter.sendMail(confirmationMailOptions),
      ]);
      console.log('[contact] emails sent, took', Date.now() - sendStart, 'ms');
    } catch (mailErr) {
      console.error('[contact] sending emails failed:', mailErr && mailErr.message);
      return next(mailErr);
    }

    return res.status(200).json({
      success: true,
      message: "Thank you! Your message has been sent successfully. We'll get back to you within 24-48 hours.",
    });
  } catch (err) {
    return next(err);
  }
};
