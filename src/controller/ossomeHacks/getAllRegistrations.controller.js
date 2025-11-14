const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const ossomeHacksSchema = require('../../models/ossomehacks.model');
const { getEventStatus } = require('../../utils/hackStatusHelper');
const Sentry = require('@sentry/node');

/**
 * Get or create OssomeHacks model for a specific database and collection
 */
const getOssomeHacksModel = (db, collectionName) => {
    if (db.models[collectionName]) {
        return db.models[collectionName];
    }
    return db.model(collectionName, ossomeHacksSchema.schema);
};

/**
 * Get all registrations (Admin)
 * GET /ossomehacks/registrations
 */
const getAllRegistrations = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { status, school, page = 1, limit = 50 } = req.query;
        const query = {};

        if (status) {
            query.registrationStatus = status;
        }

        if (school) {
            query.school = new RegExp(school, 'i');
        }

        // Get event configuration
        const hackStatus = await getOssomeHacksStatus();
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

        const skip = (parseInt(page) - 1) * parseInt(limit);

        Sentry.logger.info('Fetching all registrations', {
            operation: 'getAllRegistrations',
            database: eventDbName,
            collection: eventCollectionName,
            query: query,
            page: page,
            limit: limit
        });

        const [registrations, total] = await Promise.all([
            OssomeHacks.find(query)
                .sort({ registeredAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            OssomeHacks.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            count: registrations.length,
            total: total,
            page: parseInt(page),
            pages: Math.ceil(total / parseInt(limit)),
            data: registrations
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'getAllRegistrations'
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get registration statistics
 * GET /ossomehacks/stats
 */
const getRegistrationStats = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        // Get event configuration
        const hackStatus = await getOssomeHacksStatus();
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

        Sentry.logger.info('Fetching registration statistics', {
            operation: 'getRegistrationStats',
            database: eventDbName
        });

        const [
            totalRegistrations,
            confirmedRegistrations,
            checkedInRegistrations,
            cancelledRegistrations,
            waitlistedRegistrations,
            schoolStats,
            genderStats,
            levelOfStudyStats,
            countryStats
        ] = await Promise.all([
            OssomeHacks.countDocuments(),
            OssomeHacks.countDocuments({ registrationStatus: 'confirmed' }),
            OssomeHacks.countDocuments({ registrationStatus: 'checked-in' }),
            OssomeHacks.countDocuments({ registrationStatus: 'cancelled' }),
            OssomeHacks.countDocuments({ registrationStatus: 'waitlisted' }),
            OssomeHacks.aggregate([
                { $group: { _id: '$school', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ]),
            OssomeHacks.aggregate([
                { $group: { _id: '$gender', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            OssomeHacks.aggregate([
                { $group: { _id: '$levelOfStudy', count: { $sum: 1 } } },
                { $sort: { count: -1 } }
            ]),
            OssomeHacks.aggregate([
                { $group: { _id: '$countryOfResidence', count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 }
            ])
        ]);

        res.status(200).json({
            success: true,
            data: {
                overview: {
                    total: totalRegistrations,
                    confirmed: confirmedRegistrations,
                    checkedIn: checkedInRegistrations,
                    cancelled: cancelledRegistrations,
                    waitlisted: waitlistedRegistrations,
                    checkInRate: totalRegistrations > 0
                        ? ((checkedInRegistrations / totalRegistrations) * 100).toFixed(2) + '%'
                        : '0%'
                },
                demographics: {
                    topSchools: schoolStats,
                    genderDistribution: genderStats,
                    levelOfStudyDistribution: levelOfStudyStats,
                    topCountries: countryStats
                }
            }
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'getRegistrationStats'
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Export registrations to CSV format
 * GET /ossomehacks/export
 */
const exportRegistrations = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { status } = req.query;

        // Get event configuration
        const hackStatus = await getOssomeHacksStatus();
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
        const query = status ? { registrationStatus: status } : {};

        Sentry.logger.info('Exporting registrations', {
            operation: 'exportRegistrations',
            status: status || 'all'
        });

        const registrations = await OssomeHacks.find(query).sort({ registeredAt: -1 });

        if (registrations.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'No registrations found to export'
            });
        }

        // Convert to exportable format
        const exportData = registrations.map(reg => reg.toExport());

        res.status(200).json({
            success: true,
            count: exportData.length,
            data: exportData
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'exportRegistrations'
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getAllRegistrations,
    getRegistrationStats,
    exportRegistrations
};