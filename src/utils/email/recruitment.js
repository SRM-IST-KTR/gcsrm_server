const { sendEmail } = require('../emailService');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');

// Cache the recruitment confirmation template at module load time
let recruitmentTemplateCache = null;

/**
 * Load template into cache (called once at module initialization)
 */
const loadTemplateCache = () => {
    try {
        const templatePath = path.join(__dirname, 'templates', 'recruitment-confirmation.html');
        recruitmentTemplateCache = fs.readFileSync(templatePath, 'utf-8');
        Sentry.logger.info('Recruitment email template cached successfully', {
            operation: 'loadRecruitmentTemplateCache',
            templatePath: templatePath
        });
    } catch (error) {
        Sentry.logger.error('Failed to cache recruitment email template', {
            operation: 'loadRecruitmentTemplateCache',
            error: error.message
        });
    }
};

// Initialize template cache when module loads
loadTemplateCache();

/**
 * Load and parse recruitment confirmation email template
 * @param {Object} replacements - Object with placeholder-value pairs
 * @returns {string} Parsed HTML
 */
const loadTemplate = (replacements) => {
    let template = recruitmentTemplateCache;

    if (!template) {
        const templatePath = path.join(__dirname, 'templates', 'recruitment-confirmation.html');
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
 * Send recruitment confirmation email to participant after successful registration
 * @param {Object} participant - Participant details from the recruitment model
 */
const sendRecruitmentConfirmationEmail = async (participant) => {
    try {
        const safeName = participant?.name?.trim() || 'Candidate';

        const replacements = {
            NAME: safeName
        };

        const htmlContent = loadTemplate(replacements);

        const emailContent = {
            from: process.env.SENDER_EMAIL,
            to: participant.email,
            subject: 'Application Confirmed - GCSRM \'26',
            html: htmlContent,
            text: `
Hi ${safeName},

Your application for GitHub Community SRM Recruitment '26 has been successfully logged.

Next Steps:
Once the registration phase concludes, task briefs will be released. You can log into your recruitment portal anytime with your SRM email to view your live status.

Best regards,
GitHub Community SRM Team
            `.trim()
        };

        const { data } = await sendEmail(emailContent);

        Sentry.logger.info('Recruitment confirmation email sent successfully', {
            operation: 'sendRecruitmentConfirmationEmail',
            email: participant.email,
            messageId: data?.id
        });

        return {
            success: true,
            messageId: data?.id
        };
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                component: 'email',
                operation: 'sendRecruitmentConfirmationEmail'
            },
            extra: {
                participantEmail: participant?.email
            }
        });

        // Don't throw — registration should succeed even if email fails
        Sentry.logger.error('Failed to send recruitment confirmation email', {
            operation: 'sendRecruitmentConfirmationEmail',
            error: error.message,
            email: participant?.email
        });

        return {
            success: false,
            error: error.message
        };
    }
};

module.exports = {
    sendRecruitmentConfirmationEmail
};