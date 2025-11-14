const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const OssomeHacks = require('../../models/ossomehacks.model');
const Sentry = require('@sentry/node');

/**
 * Update registration
 * PUT /ossomehacks/registrations/:id
 */
const updateRegistration = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        const updateData = req.body;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID format'
            });
        }

        // Prevent updating MLH checkboxes to false
        if (updateData.mlhCodeOfConductAgreed === false || updateData.mlhPrivacyPolicyAgreed === false) {
            return res.status(400).json({
                success: false,
                error: 'MLH agreements cannot be revoked'
            });
        }

        Sentry.logger.info('Updating registration', {
            operation: 'updateRegistration',
            registrationId: id
        });

        const updatedRegistration = await OssomeHacks.findByIdAndUpdate(
            id,
            { ...updateData, lastUpdated: Date.now() },
            { new: true, runValidators: true }
        );

        if (!updatedRegistration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Registration updated successfully',
            data: updatedRegistration
        });

    } catch (error) {
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        Sentry.captureException(error, {
            tags: {
                operation: 'updateRegistration',
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
    updateRegistration
};
