const sponsorSchema = require('../models/sponsor.model');
const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const Sentry = require('@sentry/node');

// fetch sponsors

const fetchSponsor = async (req, res) => {
    const startTime = Date.now();

    // Log the fetch operation start
    Sentry.logger.info('Fetching sponsors', {
        operation: 'fetchSponsor',
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const queryStart = Date.now();
        const sponsors = await sponsorSchema
            .find()
            .sort({ tier: 1 })
            .lean();

        const queryDuration = Date.now() - queryStart;
        const totalDuration = Date.now() - startTime;

        // Log successful fetch with metrics
        Sentry.logger.info('Sponsors fetched successfully', {
            operation: 'fetchSponsor',
            count: sponsors.length,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database queries (over 200ms)
        if (queryDuration > 200) {
            Sentry.logger.warn('Slow database query', {
                operation: 'fetchSponsor',
                query: 'sponsors.find().sort({tier:1})',
                duration: `${queryDuration}ms`,
                count: sponsors.length,
            });
        }

        res.status(200).json(sponsors);
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Always log errors
        Sentry.logger.error('Failed to fetch sponsors', {
            operation: 'fetchSponsor',
            error: err.message,
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'fetch_sponsors',
                component: 'sponsor.controller',
            }
        });

        // Return 500 Internal Server Error for database or server issues
        res.status(500).json({
            message: 'Internal server error while fetching sponsors',
            error: err.message
        });
    }
};


// create sponsor

const createSponsor = async (req, res) => {
    const startTime = Date.now();

    // Log the create operation start
    Sentry.logger.info('Creating sponsor', {
        operation: 'createSponsor',
        sponsorName: req.body.name,
        tier: req.body.tier,
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        // Validate required fields
        const { name, logo, alt, tier, link } = req.body;
        if (!name || !logo || !alt || !tier || !link) {
            const totalDuration = Date.now() - startTime;

            Sentry.logger.warn('Missing required fields for sponsor creation', {
                operation: 'createSponsor',
                providedFields: Object.keys(req.body),
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({
                message: 'Missing required fields',
                required: ['name', 'logo', 'alt', 'tier', 'link'],
                provided: Object.keys(req.body)
            });
        }

        const saveStart = Date.now();
        const newSponsor = new sponsorSchema(req.body);
        const savedSponsor = await newSponsor.save();

        const saveDuration = Date.now() - saveStart;
        const totalDuration = Date.now() - startTime;

        // Log successful creation with metrics
        Sentry.logger.info('Sponsor created successfully', {
            operation: 'createSponsor',
            sponsorId: savedSponsor._id,
            sponsorName: savedSponsor.name,
            tier: savedSponsor.tier,
            saveDuration: `${saveDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database saves (over 200ms)
        if (saveDuration > 200) {
            Sentry.logger.warn('Slow database save', {
                operation: 'createSponsor',
                duration: `${saveDuration}ms`,
                sponsorId: savedSponsor._id,
            });
        }

        res.status(201).json(savedSponsor);
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Handle different types of errors with appropriate status codes
        if (err.name === 'ValidationError') {
            // MongoDB validation error - 400 Bad Request
            Sentry.logger.warn('Validation error creating sponsor', {
                operation: 'createSponsor',
                error: err.message,
                validationErrors: err.errors,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({
                message: 'Validation failed',
                errors: Object.keys(err.errors).map(key => ({
                    field: key,
                    message: err.errors[key].message
                }))
            });
        }

        if (err.code === 11000) {
            // Duplicate key error - 409 Conflict
            Sentry.logger.warn('Duplicate sponsor creation attempted', {
                operation: 'createSponsor',
                error: err.message,
                duration: `${totalDuration}ms`,
            });

            return res.status(409).json({
                message: 'Sponsor already exists',
                conflict: Object.keys(err.keyPattern || {})
            });
        }

        // Always log errors
        Sentry.logger.error('Failed to create sponsor', {
            operation: 'createSponsor',
            error: err.message,
            sponsorData: {
                name: req.body.name,
                tier: req.body.tier,
                link: req.body.link,
            },
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'create_sponsor',
                component: 'sponsor.controller',
            }
        });

        // Return 500 Internal Server Error for unexpected errors
        res.status(500).json({
            message: 'Internal server error while creating sponsor',
            error: err.message
        });
    }
};

//update sponsor

const updateSponsor = async (req, res) => {
    const startTime = Date.now();

    // Log the update operation start
    Sentry.logger.info('Updating sponsor', {
        operation: 'updateSponsor',
        sponsorId: req.params.id,
        updateFields: Object.keys(req.body),
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const totalDuration = Date.now() - startTime;

            // Log validation error
            Sentry.logger.warn('Invalid sponsor ID format', {
                operation: 'updateSponsor',
                sponsorId: id,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({ message: 'Invalid sponsor ID format' });
        }

        const updateStart = Date.now();
        const updatedSponsor = await sponsorSchema.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true });

        const updateDuration = Date.now() - updateStart;
        const totalDuration = Date.now() - startTime;

        if (!updatedSponsor) {
            // Log not found case
            Sentry.logger.warn('Sponsor not found for update', {
                operation: 'updateSponsor',
                sponsorId: id,
                duration: `${totalDuration}ms`,
            });

            return res.status(404).json({ message: 'Sponsor not found' });
        }

        // Log successful update with metrics
        Sentry.logger.info('Sponsor updated successfully', {
            operation: 'updateSponsor',
            sponsorId: updatedSponsor._id,
            sponsorName: updatedSponsor.name,
            updatedFields: Object.keys(req.body),
            updateDuration: `${updateDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database updates (over 200ms)
        if (updateDuration > 200) {
            Sentry.logger.warn('Slow database update', {
                operation: 'updateSponsor',
                duration: `${updateDuration}ms`,
                sponsorId: updatedSponsor._id,
            });
        }

        res.status(200).json(updatedSponsor);
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Handle different types of errors with appropriate status codes
        if (err.name === 'ValidationError') {
            // MongoDB validation error - 400 Bad Request
            Sentry.logger.warn('Validation error updating sponsor', {
                operation: 'updateSponsor',
                sponsorId: req.params.id,
                error: err.message,
                validationErrors: err.errors,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({
                message: 'Validation failed',
                errors: Object.keys(err.errors).map(key => ({
                    field: key,
                    message: err.errors[key].message
                }))
            });
        }

        if (err.name === 'CastError') {
            // Invalid ObjectId format - 400 Bad Request
            Sentry.logger.warn('Invalid ObjectId format in update', {
                operation: 'updateSponsor',
                sponsorId: req.params.id,
                error: err.message,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({
                message: 'Invalid sponsor ID format',
                provided: req.params.id
            });
        }

        // Always log errors
        Sentry.logger.error('Failed to update sponsor', {
            operation: 'updateSponsor',
            error: err.message,
            sponsorId: req.params.id,
            updateData: {
                fieldsToUpdate: Object.keys(req.body),
            },
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'update_sponsor',
                component: 'sponsor.controller',
            }
        });

        // Return 500 Internal Server Error for unexpected errors
        res.status(500).json({
            message: 'Internal server error while updating sponsor',
            error: err.message
        });
    }
};

//delete sponsor

const deleteSponsor = async (req, res) => {
    const startTime = Date.now();

    // Log the delete operation start
    Sentry.logger.info('Deleting sponsor', {
        operation: 'deleteSponsor',
        sponsorId: req.params.id,
        ip: req.ip || req.connection?.remoteAddress,
    });

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            const totalDuration = Date.now() - startTime;

            // Log validation error
            Sentry.logger.warn('Invalid sponsor ID format for deletion', {
                operation: 'deleteSponsor',
                sponsorId: id,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({ message: 'Invalid sponsor ID format' });
        }

        const deleteStart = Date.now();
        const deletedSponsor = await sponsorSchema.findByIdAndDelete(id);

        const deleteDuration = Date.now() - deleteStart;
        const totalDuration = Date.now() - startTime;

        if (!deletedSponsor) {
            // Log not found case
            Sentry.logger.warn('Sponsor not found for deletion', {
                operation: 'deleteSponsor',
                sponsorId: id,
                duration: `${totalDuration}ms`,
            });

            return res.status(404).json({ message: 'Sponsor not found' });
        }

        // Log successful deletion with metrics
        Sentry.logger.info('Sponsor deleted successfully', {
            operation: 'deleteSponsor',
            sponsorId: deletedSponsor._id,
            sponsorName: deletedSponsor.name,
            tier: deletedSponsor.tier,
            deleteDuration: `${deleteDuration}ms`,
            totalDuration: `${totalDuration}ms`,
        });

        // Log slow database deletions (over 200ms)
        if (deleteDuration > 200) {
            Sentry.logger.warn('Slow database delete', {
                operation: 'deleteSponsor',
                duration: `${deleteDuration}ms`,
                sponsorId: deletedSponsor._id,
            });
        }

        // Return 204 No Content for successful deletion (no response body needed)
        res.status(204).send();
    }
    catch (err) {
        const totalDuration = Date.now() - startTime;

        // Handle different types of errors with appropriate status codes
        if (err.name === 'CastError') {
            // Invalid ObjectId format - 400 Bad Request
            Sentry.logger.warn('Invalid ObjectId format in delete', {
                operation: 'deleteSponsor',
                sponsorId: req.params.id,
                error: err.message,
                duration: `${totalDuration}ms`,
            });

            return res.status(400).json({
                message: 'Invalid sponsor ID format',
                provided: req.params.id
            });
        }

        // Always log errors
        Sentry.logger.error('Failed to delete sponsor', {
            operation: 'deleteSponsor',
            error: err.message,
            sponsorId: req.params.id,
            duration: `${totalDuration}ms`,
        });

        Sentry.captureException(err, {
            tags: {
                operation: 'delete_sponsor',
                component: 'sponsor.controller',
            }
        });

        // Return 500 Internal Server Error for unexpected errors
        res.status(500).json({
            message: 'Internal server error while deleting sponsor',
            error: err.message
        });
    }
};

module.exports = { fetchSponsor, createSponsor, updateSponsor, deleteSponsor };