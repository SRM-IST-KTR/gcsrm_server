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

        Sentry.logger.info('Deleting registration', {
            operation: 'deleteRegistration',
            registrationId: id,
            database: eventDbName
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
