const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const ossomeHacksSchema = require('../../models/ossomehacks.model');
const { getEventStatus } = require('../../utils/hackStatusHelper');
const Sentry = require('@sentry/node');

const getOssomeHacksModel = (db, collectionName) => {
    if (db.models[collectionName]) {
        return db.models[collectionName];
    }
    return db.model(collectionName, ossomeHacksSchema.schema);
};

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

        // Get event configuration
        const hackStatus = await getEventStatus('ossomehacks3');
        const eventDbName = hackStatus.event.database;
        const eventCollectionName = hackStatus.event.collection.participants;

        if (!eventDbName || !eventCollectionName) {
            return res.status(500).json({
                success: false,
                error: 'Event database configuration is incomplete.'
            });
        }

        // Connect to event-specific database
        const db = mongoose.connection.useDb(eventDbName);
        const OssomeHacks = getOssomeHacksModel(db, eventCollectionName);

        Sentry.logger.info('Updating registration', {
            operation: 'updateRegistration',
            registrationId: id,
            database: eventDbName
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
