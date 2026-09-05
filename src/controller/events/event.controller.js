const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const Event = require('../../models/event.model');
const { getParticipantModel } = require('../../models/participant.model');
const Sentry = require('@sentry/node');
const { sendEmail } = require('../../utils/emailService');
const { safeErrorMessage } = require('../../utils/regex');

const fetchAll = async (req, res) => {
    const startTime = Date.now();

    try {
        await connectDB();
        const events = await Event.find().lean();
        const duration = Date.now() - startTime;

        return res.status(200).json({
            success: true,
            count: events.length,
            duration: `${duration}ms`,
            data: events
        });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const fetchEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await connectDB();

        const event = await Event.findById(id).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const fetchEventSlug = async (req, res) => {
    try {
        const { slug } = req.params;
        await connectDB();

        const event = await Event.findOne({ slug }).lean();
        if (!event) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: event });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const createEvent = async (req, res) => {
    try {
        await connectDB();
        const eventData = req.body.data || req.body;

        const newEvent = await Event.create(eventData);
        return res.status(201).json({ success: true, data: newEvent });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

const editEvent = async (req, res) => {
    try {
        const { id } = req.params;
        await connectDB();

        const updated = await Event.findByIdAndUpdate(id, req.body, { new: true });
        if (!updated) {
            return res.status(404).json({ success: false, error: 'Event not found' });
        }
        return res.status(200).json({ success: true, data: updated });
    } catch (error) {
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
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
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
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
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
    }
};

/**
 * Update event participant details / checkin / snacks
 */
const updateEventParticipant = async (req, res) => {
    try {
        const { email } = req.params;
        const { eventSlug, slug, ...updateData } = req.body;
        const targetSlug = eventSlug || slug;

        if (!targetSlug) {
            return res.status(400).json({ success: false, error: 'Event slug is required' });
        }

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
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
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
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
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
        Sentry.captureException(error);
        return res.status(500).json({ success: false, error: error.message });
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
            date: event.event_date || '',
            venue: event.venue || '',
            prerequisites: event.prerequisites || '',
            slug: event.slug || '',
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
};
