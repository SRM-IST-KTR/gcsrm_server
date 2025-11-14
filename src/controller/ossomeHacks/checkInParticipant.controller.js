const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const OssomeHacks = require('../../models/ossomehacks.model');
const Sentry = require('@sentry/node');

/**
 * Check-in participant
 * POST /ossomehacks/check-in/:id
 */
const checkInParticipant = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID format'
            });
        }

        const registration = await OssomeHacks.findById(id);

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        if (registration.checkInTime) {
            return res.status(400).json({
                success: false,
                error: 'Participant already checked in',
                checkInTime: registration.checkInTime
            });
        }

        registration.checkInTime = new Date();
        registration.registrationStatus = 'checked-in';
        await registration.save();

        Sentry.logger.info('Participant checked in', {
            operation: 'checkInParticipant',
            registrationId: id,
            email: registration.email
        });

        res.status(200).json({
            success: true,
            message: 'Check-in successful',
            data: {
                registrationId: registration._id,
                fullName: registration.fullName,
                email: registration.email,
                checkInTime: registration.checkInTime
            }
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'checkInParticipant',
                registrationId: req.params.id
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    checkInParticipant
};