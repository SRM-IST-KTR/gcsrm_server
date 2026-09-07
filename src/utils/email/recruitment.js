const { sendEmail } = require('../emailService');
const Sentry = require('@sentry/node');
const fs = require('fs');
const path = require('path');

// Cache the recruitment confirmation and task assigned templates at module load time
let recruitmentTemplateCache = null;
let tasksLiveTemplateCache = null;

const loadTemplateCache = () => {
    try {
        const templatePath = path.join(__dirname, 'templates', 'recruitment-confirmation.html');
        recruitmentTemplateCache = fs.readFileSync(templatePath, 'utf-8');

        const tasksLiveTemplatePath = path.join(__dirname, 'templates', 'tasks-live.html');
        tasksLiveTemplateCache = fs.readFileSync(tasksLiveTemplatePath, 'utf-8');

        Sentry.logger.info('Recruitment email templates cached successfully', {
            operation: 'loadRecruitmentTemplateCache'
        });
    } catch (error) {
        Sentry.logger.error('Failed to cache recruitment email templates', {
            operation: 'loadRecruitmentTemplateCache',
            error: error.message
        });
    }
};

// Initialize template cache when module loads
loadTemplateCache();

const loadTemplate = (replacements) => {
    let template = recruitmentTemplateCache;
    if (!template) {
        const templatePath = path.join(__dirname, 'templates', 'recruitment-confirmation.html');
        template = fs.readFileSync(templatePath, 'utf-8');
    }
    Object.keys(replacements).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = replacements[key] || '';
        template = template.replace(new RegExp(placeholder, 'g'), value);
    });
    return template;
};

const loadTasksLiveTemplate = (replacements) => {
    let template = tasksLiveTemplateCache;
    if (!template) {
        const templatePath = path.join(__dirname, 'templates', 'tasks-live.html');
        template = fs.readFileSync(templatePath, 'utf-8');
    }
    Object.keys(replacements).forEach(key => {
        const placeholder = `{{${key}}}`;
        const value = replacements[key] || '';
        template = template.replace(new RegExp(placeholder, 'g'), value);
    });
    return template;
};

const sendRecruitmentConfirmationEmail = async (participant) => {
    try {
        const safeName = participant?.name?.trim() || 'Candidate';
        const replacements = { NAME: safeName };
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
        return { success: true, messageId: data?.id };
    } catch (error) {
        Sentry.captureException(error, {
            tags: { component: 'email', operation: 'sendRecruitmentConfirmationEmail' },
            extra: { participantEmail: participant?.email }
        });
        return { success: false, error: error.message };
    }
};

const sendTasksLiveEmail = async (participant) => {
    try {
        const safeName = participant?.name?.trim() || 'Candidate';
        const replacements = { NAME: safeName };
        const htmlContent = loadTasksLiveTemplate(replacements);

        const emailContent = {
            from: process.env.SENDER_EMAIL,
            to: participant.email,
            subject: 'GitHub Community SRM Recruitment ’26 | Task Submissions Are Live',
            html: htmlContent,
            text: `
Hi ${safeName},

Task submissions for GitHub Community SRM Recruitment ’26 are now live!

Please submit your completed tasks on the recruitment website by Deadline: 12th Sept, 23:59 PM IST.

Click here to submit: https://recruitment.githubsrmist.in/apply

All the best!
GitHub Community SRM
            `.trim()
        };

        const { data } = await sendEmail(emailContent);
        return { success: true, messageId: data?.id };
    } catch (error) {
        Sentry.captureException(error, {
            tags: { component: 'email', operation: 'sendTasksLiveEmail' },
            extra: { participantEmail: participant?.email }
        });
        return { success: false, error: error.message };
    }
};

module.exports = {
    sendRecruitmentConfirmationEmail,
    sendTaskAssignedEmail,
    sendTasksLiveEmail
};
