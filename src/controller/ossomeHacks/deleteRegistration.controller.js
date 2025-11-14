const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const OssomeHacks = require('../../models/ossomehacks.model');
const Sentry = require('@sentry/node');

/**
 * Delete registration
 * DELETE /ossomehacks/registrations/:id
 */
const deleteRegistration = async (req, res) => {
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

        Sentry.logger.info('Deleting registration', {
            operation: 'deleteRegistration',
            registrationId: id
        });

        const deletedRegistration = await OssomeHacks.findByIdAndDelete(id);

        if (!deletedRegistration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Registration deleted successfully'
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'deleteRegistration',
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
    deleteRegistration
};
