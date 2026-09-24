const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const Event = require('../../models/event.model');
const { getParticipantModel } = require('../../models/participant.model');
const Sentry = require('@sentry/node');
const { sendEmail } = require('../../utils/emailService');
const { safeErrorMessage } = require('../../utils/regex');
const { pick, escapeHtml } = require('../../utils/sanitize');

// `database` and `collection` are deliberately excluded: they control which
// DB/collection participant endpoints read from, so they must not be client-settable.
const EVENT_EDITABLE_FIELDS = [
    'slug',
    'event_name',
    'event_description',
    'speakers_details',
    'Registration_startDate',
    'Registration_endDate',
    'event_date',
    'is_active',
    'venue',
    'sponsors_details',
    'duration',
    'prerequisites',
    'cost',
    'poster_url',
    'registration_url',
    'certificate',
    'jimp_config',
    'teamEvent',
    'teamSize',
];

const PARTICIPANT_EDITABLE_FIELDS = ['name', 'regNo', 'phn', 'dept', 'rsvp', 'checkin', 'snacks'];

const serverError = (res, error, fallback) => {
    Sentry.captureException(error);
    return res.status(500).json({ success: false, error: safeErrorMessage(error, fallback) });
};

const fetchAll = async (req, res) => {
    const startTime = Date.now();

    try {
        await connectDB();
        const events = await Event.find().select('-database -collection').lean();
        const duration = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            count: events.length,
            duration: `${duration}ms`,
            data: events
        });
    } catch (error) {
        return serverError(res, error, 'Failed to fetch events');
    }
};

const fetchEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await connectDB();

        const event = await Event.findById(id).select('-database -collection').lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return serverError(res, error, 'Failed to fetch event');
    }
};

const fetchEventSlug = async (req, res) => {
    try {
        const { slug } = req.params;
        await connectDB();

        const event = await Event.findOne({ slug }).select('-database -collection').lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        return serverError(res, error, 'Failed to fetch event');
    }
};

const createEvent = async (req, res) => {
    try {
        await connectDB();
        const eventData = req.body.data || req.body;

        const newEvent = await Event.create(eventData);
        return res.status(201).json({ success: true, data: newEvent });
    } catch (error) {
        return serverError(res, error, 'Failed to create event');
    }
};

const editEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await connectDB();

        const updateData = pick(req.body.data || req.body, EVENT_EDITABLE_FIELDS);
        const updated = await Event.findByIdAndUpdate(id, updateData, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return serverError(res, error, 'Failed to update event');
    }
};

const deleteEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await connectDB();

        const deleted = await Event.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: deleted });
    } catch (error) {
        return serverError(res, error, 'Failed to delete event');
    }
};

/**
 * Fetch participants for an event by slug
 */
const fetchEventParticipants = async (req, res) => {
    try {
        const { slug } = req.params;
        await connectDB();

        const event = await Event.findOne({ slug }).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const targetDbName = event.database || 'GCSRM';
        const targetCollectionName = event.collection?.participants || `${slug}_participants`;

        const targetConn = mongoose.connection.useDb(targetDbName, { useCache: true });
        const Participant = getParticipantModel(targetConn, targetCollectionName);

        const participants = await Participant.find().lean();
        return res.status(200).json({ success: true, count: participants.length, data: participants });
    } catch (error) {
        return serverError(res, error, 'Failed to fetch participants');
    }
};

/**
 * Update event participant details / checkin / snacks
 */
const updateEventParticipant = async (req, res) => {
    try {
        const { email } = req.params;
        const { eventSlug, slug } = req.body;
        const targetSlug = eventSlug || slug;

        if (!targetSlug) {
            return res.status(400).json({ success: false, error: 'Event slug is required' });
        }

        const updateData = pick(req.body, PARTICIPANT_EDITABLE_FIELDS);

        await connectDB();
        const event = await Event.findOne({ slug: targetSlug }).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const targetDbName = event.database || 'GCSRM';
        const targetCollectionName = event.collection?.participants || `${targetSlug}_participants`;

        const targetConn = mongoose.connection.useDb(targetDbName, { useCache: true });
        const Participant = getParticipantModel(targetConn, targetCollectionName);

        const updated = await Participant.findOneAndUpdate(
            { email: email.toLowerCase().trim() },
            updateData,
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        return serverError(res, error, 'Failed to update participant');
    }
};

/**
 * QR Check-in toggle / update
 */
const checkinEventParticipant = async (req, res) => {
    try {
        const { slug, email } = req.body;
        if (!slug || !email) {
            return res.status(400).json({ success: false, error: 'Missing slug or email' });
        }

        await connectDB();
        const event = await Event.findOne({ slug }).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const targetDbName = event.database || 'GCSRM';
        const targetCollectionName = event.collection?.participants || `${slug}_participants`;

        const targetConn = mongoose.connection.useDb(targetDbName, { useCache: true });
        const Participant = getParticipantModel(targetConn, targetCollectionName);

        const participant = await Participant.findOne({ email: email.toLowerCase().trim() });
        if (!participant) {
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        participant.checkin = true;
        await participant.save();

        return res.status(200).json({ success: true, message: 'Check-in successful', data: participant });
    } catch (error) {
        return serverError(res, error, 'Failed to check in participant');
    }
};

/**
 * QR Snacks toggle / update
 */
const snacksEventParticipant = async (req, res) => {
    try {
        const { slug, email } = req.body;
        if (!slug || !email) {
            return res.status(400).json({ success: false, error: 'Missing slug or email' });
        }

        await connectDB();
        const event = await Event.findOne({ slug }).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const targetDbName = event.database || 'GCSRM';
        const targetCollectionName = event.collection?.participants || `${slug}_participants`;

        const targetConn = mongoose.connection.useDb(targetDbName, { useCache: true });
        const Participant = getParticipantModel(targetConn, targetCollectionName);

        const participant = await Participant.findOne({ email: email.toLowerCase().trim() });
        if (!participant) {
            return res.status(404).json({ success: false, error: 'Participant not found' });
        }

        participant.snacks = true;
        await participant.save();

        return res.status(200).json({ success: true, message: 'Snacks marked successfully', data: participant });
    } catch (error) {
        return serverError(res, error, 'Failed to mark snacks');
    }
};

/**
 * Send RSVP request email to participant
 */
const sendEventRsvpEmail = async (req, res) => {
    try {
        const { participant, event } = req.body || {};
        if (!participant?.email || !event?.event_name) {
            return res.status(400).json({ success: false, error: 'Participant email and event details required' });
        }

        const backendOrigin = process.env.BACKEND_PUBLIC_URL || (req.headers?.host ? `${req.protocol || 'http'}://${req.headers.host}` : 'https://octacore.githubsrmist.in');
        const rsvpLink = `${backendOrigin}/api/events/rsvp?email=${encodeURIComponent(participant.email)}&slug=${encodeURIComponent(event.slug || '')}`;

        const templatePath = path.join(__dirname, '../../utils/email/templates/rsvp.html');
        let html = fs.readFileSync(templatePath, 'utf-8');

        const replacements = {
            name: participant.name || '',
            email: participant.email || '',
            phn: participant.phn || '',
            event: event.event_name || '',
            department: participant.dept || '',
            registrationNumber: participant.regNo || '',
            event_description: event.event_description || '',
            date: event.event_date ? new Date(event.event_date).toLocaleString() : '',
            venue: event.venue || '',
            prerequisites: event.prerequisites || 'None',
            slug: event.slug || '',
            rsvp_link: rsvpLink,
        };
        for (const [key, val] of Object.entries(replacements)) {
            html = html.replaceAll(`{{${key}}}`, val);
        }

        await sendEmail({
            to: participant.email,
            subject: `RSVP Required for ${event.event_name}`,
            html,
            from: '"GitHub Community SRM | Events" <events@githubsrmist.tech>',
            reply_to: 'community@githubsrmist.tech',
        });

        return res.status(200).json({ success: true, message: 'RSVP email sent successfully' });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: safeErrorMessage(error, 'Error sending email') });
    }
};

/**
 * GET /api/events/rsvp?email=&slug=
 * Handles attendee clicking the confirmation link in the RSVP email
 */
const confirmParticipantRsvp = async (req, res) => {
    try {
        const { email, slug } = req.query;
        if (!email || !slug) {
            return res.status(400).send(`<h2>Invalid confirmation link. Missing email or event parameter.</h2>`);
        }

        await connectDB();
        const event = await Event.findOne({ slug }).lean();
        if (!event) {
            return res.status(404).send(`<h2>Event not found.</h2>`);
        }

        const targetDbName = event.database || 'GCSRM';
        const targetCollectionName = event.collection?.participants || `${slug}_participants`;
        const targetConn = mongoose.connection.useDb(targetDbName, { useCache: true });
        const Participant = getParticipantModel(targetConn, targetCollectionName);

        const participant = await Participant.findOne({ email: email.toLowerCase().trim() });
        if (!participant) {
            return res.status(404).send(`<h2>Participant record not found for this event.</h2>`);
        }

        participant.rsvp = true;
        await participant.save();

        return res.status(200).send(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="utf-8">
                <title>RSVP Confirmed - ${escapeHtml(event.event_name)}</title>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090b; color: #f4f4f5; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 20px; }
                    .card { background: #18181b; border: 1px solid #27272a; border-radius: 20px; padding: 36px 32px; max-width: 440px; text-align: center; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
                    .badge { display: inline-block; background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.25); padding: 4px 14px; border-radius: 9999px; font-size: 11.5px; font-weight: 700; text-transform: uppercase; margin-bottom: 16px; }
                    h1 { font-size: 24px; font-weight: 800; margin: 0 0 8px 0; color: #ffffff; }
                    p { font-size: 14px; color: #a1a1aa; line-height: 1.6; margin: 0 0 20px 0; }
                    .details { background: #27272a; border-radius: 12px; padding: 16px; text-align: left; font-size: 13px; margin-bottom: 24px; }
                    .row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #3f3f46; }
                    .row:last-child { border-bottom: none; }
                    .lbl { color: #a1a1aa; }
                    .val { color: #ffffff; font-weight: 600; }
                </style>
            </head>
            <body>
                <div class="card">
                    <span class="badge">✓ Confirmed</span>
                    <h1>Your Seat is Reserved!</h1>
                    <p>Hi <strong>${escapeHtml(participant.name)}</strong>, your seat for <strong>${escapeHtml(event.event_name)}</strong> has been secured.</p>
                    <div class="details">
                        <div class="row"><span class="lbl">Venue</span><span class="val">${escapeHtml(event.venue || 'Campus Venue')}</span></div>
                        <div class="row"><span class="lbl">Date</span><span class="val">${new Date(event.event_date).toLocaleString()}</span></div>
                        <div class="row"><span class="lbl">Reg No</span><span class="val">${escapeHtml(participant.regNo)}</span></div>
                    </div>
                    <p style="font-size: 12px; color: #71717a; margin: 0;">Show your registration number or college ID at the desk for check-in.</p>
                </div>
            </body>
            </html>
        `);
    } catch (err) {
        Sentry.captureException(err);
        return res.status(500).send(`<h2>Error processing RSVP confirmation. Please try again later.</h2>`);
    }
};

module.exports = {
    fetchAll,
    fetchEvent,
    fetchEventSlug,
    createEvent,
    editEvent,
    deleteEvent,
    fetchEventParticipants,
    updateEventParticipant,
    checkinEventParticipant,
    snacksEventParticipant,
    sendEventRsvpEmail,
    confirmParticipantRsvp,
};
