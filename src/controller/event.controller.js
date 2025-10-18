const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const eventSchema = require('../models/event.model');
const Sentry = require('@sentry/node');

const createEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { data } = req.body;
        if (!data) {
            Sentry.captureMessage('Event creation failed - no data provided', {
                level: 'warning',
                tags: {
                    operation: 'createEvent',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No data provided"
            });
        }

        Sentry.logger.info('Creating new event', {
            operation: 'createEvent',
            eventName: data.event_name,
            eventSlug: data.slug
        });

        const eventnew = new eventSchema(data);
        const saved = await eventnew.save();

        Sentry.logger.info('Event created successfully', {
            operation: 'createEvent',
            eventId: saved._id.toString(),
            eventSlug: saved.slug
        });

        res.status(201).json({
            success: true,
            data: saved
        });
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'createEvent'
            },
            extra: {
                eventData: req.body?.data
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const editEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { data } = req.body;
        if (!data || !data.id) {
            Sentry.captureMessage('Event edit failed - no event ID provided', {
                level: 'warning',
                tags: {
                    operation: 'editEvent',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No event ID provided"
            });
        }
        if (!mongoose.Types.ObjectId.isValid(data.id)) {
            Sentry.captureMessage('Event edit failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'editEvent',
                    validation: 'failed'
                },
                extra: {
                    providedId: data.id
                }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }

        Sentry.logger.info('Editing event', {
            operation: 'editEvent',
            eventId: data.id
        });

        const updatedEvent = await eventSchema.findByIdAndUpdate(data.id, data, { new: true, runValidators: true, context: 'query' });
        if (!updatedEvent) {
            Sentry.captureMessage('Event not found for edit', {
                level: 'warning',
                tags: {
                    operation: 'editEvent',
                    eventId: data.id
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        Sentry.logger.info('Event updated successfully', {
            operation: 'editEvent',
            eventId: updatedEvent._id.toString(),
            eventSlug: updatedEvent.slug
        });

        res.status(200).json({
            success: true,
            data: updatedEvent
        });
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'editEvent',
                eventId: req.body?.data?.id
            },
            extra: {
                updateData: req.body?.data
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const deleteEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id) {
            Sentry.captureMessage('Event deletion failed - no event ID provided', {
                level: 'warning',
                tags: {
                    operation: 'deleteEvent',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No event ID provided"
            });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Event deletion failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'deleteEvent',
                    validation: 'failed'
                },
                extra: {
                    providedId: id
                }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }

        Sentry.logger.info('Deleting event', {
            operation: 'deleteEvent',
            eventId: id
        });

        const deletedevent = await eventSchema.findByIdAndDelete(id);
        if (!deletedevent) {
            Sentry.captureMessage('Event not found for deletion', {
                level: 'warning',
                tags: {
                    operation: 'deleteEvent',
                    eventId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        Sentry.logger.info('Event deleted successfully', {
            operation: 'deleteEvent',
            eventId: id,
            eventSlug: deletedevent.slug
        });

        res.status(200).json({
            success: true,
            message: 'Event deleted successfully'
        });
    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'deleteEvent',
                eventId: req.params?.id
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const fetchEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;
        if (!id) {
            Sentry.captureMessage('Event fetch failed - no event ID provided', {
                level: 'warning',
                tags: {
                    operation: 'fetchEvent',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: "No event ID provided"
            });
        }
        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Event fetch failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'fetchEvent',
                    validation: 'failed'
                },
                extra: {
                    providedId: id
                }
            });

            return res.status(400).json({
                success: false,
                error: "Invalid event ID format"
            });
        }

        const fetchedevent = await eventSchema.findById(id);
        if (!fetchedevent) {
            Sentry.captureMessage('Event not found', {
                level: 'info',
                tags: {
                    operation: 'fetchEvent',
                    eventId: id
                }
            });

            return res.status(404).json({
                success: false,
                error: "Event not found"
            });
        }

        Sentry.logger.info('Event fetched successfully', {
            operation: 'fetchEvent',
            eventId: id,
            eventSlug: fetchedevent.slug
        });

        res.status(200).json({
            success: true,
            data: fetchedevent
        });
    }
    catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'fetchEvent',
                eventId: req.params?.id
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

const fetchAll = async (req, res) => {
    const startTime = Date.now();

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        Sentry.logger.info('Fetching all events', {
            operation: 'fetchAll',
            ip: req.ip || req.connection?.remoteAddress
        });

        const queryStart = Date.now();
        const allEvents = await eventSchema.find();
        const queryDuration = Date.now() - queryStart;

        if (allEvents.length === 0) { // Check if the array is empty
            Sentry.logger.info('No events found in database', {
                operation: 'fetchAll'
            });

            return res.status(404).json({
                success: false,
                error: "No events found"
            });
        }

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('All events fetched successfully', {
            operation: 'fetchAll',
            count: allEvents.length,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        // Log slow database queries (over 200ms)
        if (queryDuration > 200) {
            Sentry.logger.warn('Slow database query', {
                operation: 'fetchAll',
                query: 'events.find()',
                duration: `${queryDuration}ms`,
                count: allEvents.length
            });
        }

        res.status(200).json({
            success: true,
            count: allEvents.length,
            data: allEvents
        });
    }
    catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'fetchAll'
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    createEvent,
    editEvent,
    deleteEvent,
    fetchEvent,
    fetchAll
};
