const mongoose = require('mongoose');
const { connectDB } = require('../utils/db');
const eventSchema = require('../models/event.model');
const { getParticipantModel } = require('../models/participant.model');
const Sentry = require('@sentry/node');

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
        const allEvents = await eventSchema.find().sort({ event_date: -1 }).lean();
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

        const fetchedevent = await eventSchema.findById(id).lean();
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

const fetchEventSlug = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { slug } = req.params;
        if (!slug) {
            Sentry.captureMessage('Event fetch failed - no event slug provided', {
                level: 'warning',
                tags: {
                    operation: 'fetchEventSlug',
                    validation: 'failed'
                }
            });

            return res.status(400).json({
                success: false,
                error: 'No event slug provided'
            });
        }

        const normalizedSlug = slug.toString().trim();

        // Use case-insensitive regex to match slugs regardless of case
        const fetchedEvent = await eventSchema.findOne({
            slug: { $regex: new RegExp(`^${normalizedSlug}$`, 'i') }
        }).lean();
        if (!fetchedEvent) {
            Sentry.captureMessage('Event not found by slug', {
                level: 'info',
                tags: {
                    operation: 'fetchEventSlug',
                    eventSlug: normalizedSlug
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Event not found'
            });
        }

        Sentry.logger.info('Event fetched successfully by slug', {
            operation: 'fetchEventSlug',
            eventSlug: normalizedSlug,
            eventId: fetchedEvent._id?.toString()
        });

        res.status(200).json({
            success: true,
            data: fetchedEvent
        });
    }
    catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'fetchEventSlug',
                eventSlug: req.params?.slug
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

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

        const { id } = req.params;

        if (!id) {
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

        if (!mongoose.Types.ObjectId.isValid(id)) {
            Sentry.captureMessage('Event edit failed - invalid ID format', {
                level: 'warning',
                tags: {
                    operation: 'editEvent',
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

        Sentry.logger.info('Editing event', {
            operation: 'editEvent',
            eventId: id
        });

        const updatedEvent = await eventSchema.findByIdAndUpdate(
            id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true, context: 'query' }
        );

        if (!updatedEvent) {
            Sentry.captureMessage('Event not found for edit', {
                level: 'warning',
                tags: {
                    operation: 'editEvent',
                    eventId: id
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
                eventId: req.params?.id
            },
            extra: {
                updateData: req.body
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

const registerInEvent = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { name, regNo, email, phn, dept, slug } = req.body;

        // Validate required fields
        if (!name || !regNo || !email || !phn || !dept || !slug) {
            Sentry.captureMessage('Event registration failed - missing required fields', {
                level: 'warning',
                tags: {
                    operation: 'registerInEvent',
                    validation: 'failed'
                },
                extra: {
                    providedFields: { name: !!name, regNo: !!regNo, email: !!email, phn: !!phn, dept: !!dept, slug: !!slug }
                }
            });

            return res.status(400).json({
                success: false,
                error: "All fields are required: name, regNo, email, phn, dept, slug"
            });
        }

        Sentry.logger.info('Processing event registration', {
            operation: 'registerInEvent',
            eventSlug: slug,
            email: email
        });

        // Find the event by slug
        const event = await eventSchema.findOne({ slug }).lean();

        if (!event) {
            Sentry.captureMessage('Event registration failed - event not found', {
                level: 'warning',
                tags: {
                    operation: 'registerInEvent',
                    eventSlug: slug
                }
            });

            return res.status(404).json({
                success: false,
                error: "Event not found"
            });
        }

        // Check if event is active
        if (!event.is_active) {
            Sentry.captureMessage('Event registration failed - event not active', {
                level: 'info',
                tags: {
                    operation: 'registerInEvent',
                    eventSlug: slug
                }
            });

            return res.status(400).json({
                success: false,
                error: "This event is not currently accepting registrations"
            });
        }

        // Check if event has already passed
        if (new Date(event.event_date) < new Date()) {
            Sentry.captureMessage('Event registration failed - event has passed', {
                level: 'info',
                tags: {
                    operation: 'registerInEvent',
                    eventSlug: slug,
                    eventDate: event.event_date
                }
            });

            return res.status(400).json({
                success: false,
                error: "This event has already passed"
            });
        }

        const { database, collection } = event;
        const participantsCollection = collection.participants;

        // Connect to the event-specific database
        const db = mongoose.connection.useDb(database);

        // Get or create the Participant model for this collection
        const Participant = getParticipantModel(db, participantsCollection);

        // Check if email already registered
        const existingParticipantByEmail = await Participant.findOne({ email: { $eq: email } });

        if (existingParticipantByEmail) {
            Sentry.captureMessage('Event registration failed - duplicate email', {
                level: 'info',
                tags: {
                    operation: 'registerInEvent',
                    eventSlug: slug
                },
                extra: {
                    email: email
                }
            });

            return res.status(400).json({
                success: false,
                error: "This email is already registered for this event"
            });
        }

        // Check if registration number already registered
        const existingParticipantByRegNo = await Participant.findOne({ regNo: { $eq: regNo } });

        if (existingParticipantByRegNo) {
            Sentry.captureMessage('Event registration failed - duplicate registration number', {
                level: 'info',
                tags: {
                    operation: 'registerInEvent',
                    eventSlug: slug
                },
                extra: {
                    regNo: regNo
                }
            });

            return res.status(400).json({
                success: false,
                error: "This registration number is already registered for this event"
            });
        }

        // Create new participant
        const newParticipant = new Participant({
            name,
            regNo,
            email,
            phn,
            dept
        });

        await newParticipant.save();

        Sentry.logger.info('Participant registered successfully', {
            operation: 'registerInEvent',
            eventSlug: slug,
            participantId: newParticipant._id.toString(),
            email: email
        });

        // Send registration confirmation email
        try {
            const { sendRegistrationEmail } = require('../utils/email/registration');
            await sendRegistrationEmail(newParticipant, event);

            Sentry.logger.info('Registration email sent successfully', {
                operation: 'registerInEvent',
                eventSlug: slug,
                email: email
            });
        } catch (emailError) {
            // Log email error but don't fail the registration
            Sentry.captureException(emailError, {
                tags: {
                    operation: 'registerInEvent',
                    subOperation: 'sendEmail',
                    eventSlug: slug
                },
                extra: {
                    participantId: newParticipant._id.toString()
                }
            });

            Sentry.logger.warn('Failed to send registration email, but registration was successful', {
                operation: 'registerInEvent',
                eventSlug: slug,
                error: emailError.message
            });
        }

        res.status(201).json({
            success: true,
            message: "Registration successful! A confirmation email has been sent.",
            data: {
                participantId: newParticipant._id,
                name: newParticipant.name,
                email: newParticipant.email,
                regNo: newParticipant.regNo,
                event: {
                    name: event.event_name,
                    slug: event.slug,
                    date: event.event_date,
                    venue: event.venue
                }
            }
        });
    }
    catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'registerInEvent'
            },
            extra: {
                body: req.body
            }
        });

        res.status(500).json({
            success: false,
            error: error.message || "Internal Server Error"
        });
    }
}
module.exports = {
    fetchAll,
    fetchEvent,
    fetchEventSlug,
    createEvent,
    editEvent,
    deleteEvent,
    registerInEvent
};
