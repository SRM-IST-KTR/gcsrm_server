const transporter = require('../mailer');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');

// Cache the email template at module load time to avoid synchronous I/O during runtime
let registrationTemplateCache = null;

/**
 * Load template into cache (called once at module initialization)
 */
const loadTemplateCache = () => {
    try {
        const templatePath = path.join(__dirname, 'templates', 'registration.html');
        registrationTemplateCache = fs.readFileSync(templatePath, 'utf-8');
        Sentry.logger.info('Email template cached successfully', {
            operation: 'loadTemplateCache',
            templatePath: templatePath
        });
    } catch (error) {
        Sentry.logger.error('Failed to cache email template', {
            operation: 'loadTemplateCache',
            error: error.message
        });
        // Template will be loaded on-demand if cache fails
    }
};

// Initialize template cache when module loads
loadTemplateCache();

/**
 * Load and parse email template
 * @param {string} templateName - Name of the template file
 * @param {Object} replacements - Object with placeholder-value pairs
 * @returns {string} Parsed HTML
 */
const loadTemplate = (templateName, replacements) => {
    // Use cached template or fall back to synchronous read if cache is not available
    let template = registrationTemplateCache;

    if (!template) {
        const templatePath = path.join(__dirname, 'templates', templateName);
        template = fs.readFileSync(templatePath, 'utf-8');
    }

    // Replace all placeholders
    Object.keys(replacements).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = replacements[key] || '';
        template = template.replace(new RegExp(placeholder, 'g'), value);
    });

    return template;
};

/**
 * Send registration confirmation email to participant
 * @param {Object} participant - Participant details
 * @param {Object} event - Event details
 */
const sendRegistrationEmail = async (participant, event) => {
    try {
        // Format event date and time
        const eventDate = new Date(event.event_date).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        const eventTime = new Date(event.event_date).toLocaleTimeString('en-IN', {
            hour: '2-digit',
            minute: '2-digit'
        });

        // Prepare duration HTML
        const durationHtml = event.duration
            ? `<p style="margin: 10px 0; color: #555555; font-size: 14px;">
                <strong>Duration:</strong> ${event.duration} minutes
               </p>`
            : '';

        // Prepare description HTML
        const descriptionHtml = event.event_description
            ? `<div style="margin: 20px 0;">
                <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">About this Event:</p>
                <p style="color: #555555; font-size: 14px; line-height: 1.6; margin: 0;">${event.event_description}</p>
               </div>`
            : '';

        // Prepare prerequisites HTML
        const prerequisitesHtml = event.prerequisites && event.prerequisites.length > 0
            ? `<div style="margin: 20px 0;">
                <p style="color: #333333; font-size: 16px; font-weight: 600; margin: 0 0 10px 0;">📋 Prerequisites:</p>
                <ul style="color: #555555; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                    ${event.prerequisites.map(prereq => `<li>${prereq}</li>`).join('')}
                </ul>
               </div>`
            : '';

        // Prepare cost HTML
        const costHtml = event.cost > 0
            ? `<li>Event Fee: ₹${event.cost}</li>`
            : '<li>This is a free event</li>';

        // Prepare template replacements
        const replacements = {
            PARTICIPANT_NAME: participant.name,
            PARTICIPANT_REGNO: participant.regNo,
            PARTICIPANT_EMAIL: participant.email,
            PARTICIPANT_PHONE: participant.phn,
            PARTICIPANT_DEPT: participant.dept,
            EVENT_NAME: event.event_name,
            EVENT_DATE: eventDate,
            EVENT_TIME: eventTime,
            EVENT_VENUE: event.venue,
            EVENT_DURATION: durationHtml,
            EVENT_DESCRIPTION: descriptionHtml,
            EVENT_PREREQUISITES: prerequisitesHtml,
            EVENT_COST: costHtml,
            CURRENT_YEAR: new Date().getFullYear().toString()
        };

        // Load and parse HTML template
        const htmlContent = loadTemplate('registration.html', replacements);

        const emailContent = {
            from: process.env.ZOHO_SMTP_USER || process.env.SENDER_EMAIL,
            to: participant.email,
            subject: `Registration Confirmed - ${event.event_name}`,
            html: htmlContent,

            text: `
Hi ${participant.name},

You're all set for ${event.event_name}!

Event Details:
- Event: ${event.event_name}
- Date: ${new Date(event.event_date).toLocaleDateString('en-IN')}
- Time: ${new Date(event.event_date).toLocaleTimeString('en-IN')}
- Venue: ${event.venue}
${event.duration ? `- Duration: ${event.duration} minutes` : ''}

Your Registration:
- Name: ${participant.name}
- Registration No: ${participant.regNo}
- Email: ${participant.email}
- Phone: ${participant.phn}
- Department: ${participant.dept}

${event.event_description ? `About this Event:\n${event.event_description}\n` : ''}

${event.prerequisites && event.prerequisites.length > 0 ? `Prerequisites:\n${event.prerequisites.map(p => `- ${p}`).join('\n')}\n` : ''}

Important Notes:
- Please arrive 10 minutes before the event starts
- Bring your college ID card for verification
- Keep this email for reference
${event.cost > 0 ? `- Event Fee: ₹${event.cost}` : '- This is a free event'}

If you have any questions or need to cancel your registration, please contact us.

Looking forward to seeing you there!

---
GitHub Club SRM
Building the future, one commit at a time
© ${new Date().getFullYear()} GitHub Club SRM. All rights reserved.
            `
        };

        const info = await transporter.sendMail(emailContent);

        Sentry.logger.info('Registration email sent successfully', {
            operation: 'sendRegistrationEmail',
            email: participant.email,
            event: event.slug,
            messageId: info.messageId
        });

        return {
            success: true,
            messageId: info.messageId
        };
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                component: 'email',
                operation: 'sendRegistrationEmail'
            },
            extra: {
                participantEmail: participant.email,
                eventSlug: event.slug
            }
        });

        // Don't throw error - registration should succeed even if email fails
        Sentry.logger.error('Failed to send registration email', {
            operation: 'sendRegistrationEmail',
            error: error.message,
            email: participant.email
        });

        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendRegistrationEmail
};
