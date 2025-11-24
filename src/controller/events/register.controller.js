const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const eventSchema = require('../../models/event.model');
const { getParticipantModel } = require('../../models/participant.model');
const Sentry = require('@sentry/node');

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
            const { sendRegistrationEmail } = require('../../utils/email/registration');
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
    registerInEvent
};
