const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const Sentry = require('@sentry/node');
const { getEventStatus } = require('../../utils/hackStatusHelper');

/**
 * Check registration status for OssomeHacks
 * GET /ossomehacks/registration-status
 */
const HackStatus = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        // Use reusable helper to get status
        const hackStatus = await getEventStatus('ossomehacks3');

        Sentry.logger.info('Registration status checked', {
            operation: 'HackStatus',
            status: hackStatus.status,
            isOpen: hackStatus.isOpen
        });

        return res.status(200).json({
            success: true,
            data: {
                status: hackStatus.status,
                isOpen: hackStatus.isOpen,
                registrationStartDate: hackStatus.registrationStartDate,
                registrationEndDate: hackStatus.registrationEndDate,
                message: hackStatus.message,
                timeRemaining: hackStatus.timeRemaining
            }
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'HackStatus',
                category: 'ossomehacks'
            }
        });

        // Check if this is our custom error from the helper
        if (error.statusCode === 404) {
            return res.status(500).json({
                success: false,
                error: error.message
            });
        }

        return res.status(500).json({
            success: false,
            error: 'Failed to fetch registration status. Please try again later.'
        });
    }
};

module.exports = {
    HackStatus
};
