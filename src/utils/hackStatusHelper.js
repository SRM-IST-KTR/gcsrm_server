const mongoose = require('mongoose');
const { connectDB } = require('./db');
const Event = require('../models/event.model');
const Sentry = require('@sentry/node');

/**
 * Get event registration status and details
 * @param {string} slug - Event slug to look up
 * @returns {Object} { event, status, isOpen, registrationStartDate, registrationEndDate, message, timeRemaining }
 * @throws {Error} If event not found or database error
 */
const getEventStatus = async (slug) => {
    if (mongoose.connection.readyState !== 1) {
        await connectDB();
    }

    // Fetch event from database by slug
    const event = await Event.findOne({ slug }).lean();

    if (!event) {
        const error = new Error(`Event with slug '${slug}' not found in database`);
        error.statusCode = 404;
        throw error;
    }

    if (!event.is_active) {
        const error = new Error('Event registration is currently not active');
        error.statusCode = 403;
        throw error;
    }

    const now = new Date();
    const registrationStartDate = new Date(event.Registration_startDate);
    const registrationEndDate = new Date(event.Registration_endDate);

    let status;
    let message;
    let isOpen = false;

    if (now.getTime() < registrationStartDate.getTime()) {
        status = 'not_started';
        message = `Registration opens on ${registrationStartDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    } else if (now.getTime() > registrationEndDate.getTime()) {
        status = 'closed';
        message = `Registration closed on ${registrationEndDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
    } else {
        status = 'open';
        message = `Registration is open until ${registrationEndDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        })}`;
        isOpen = true;
    }

    let timeRemaining = null;
    if (status === 'not_started') {
        const msRemaining = registrationStartDate.getTime() - now.getTime();
        timeRemaining = {
            days: Math.floor(msRemaining / (1000 * 60 * 60 * 24)),
            hours: Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
        };
    } else if (status === 'open') {
        const msRemaining = registrationEndDate.getTime() - now.getTime();
        timeRemaining = {
            days: Math.floor(msRemaining / (1000 * 60 * 60 * 24)),
            hours: Math.floor((msRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
            minutes: Math.floor((msRemaining % (1000 * 60 * 60)) / (1000 * 60))
        };
    }

    return {
        event,
        status,
        isOpen,
        registrationStartDate,
        registrationEndDate,
        message,
        timeRemaining
    };
};

/**
 * Validate if registration period is active
 * @param {Date} registrationStartDate - Start date of registration
 * @param {Date} registrationEndDate - End date of registration
 * @param {Date} submissionTime - Optional client-side submission timestamp
 * @returns {Object} { isValid: boolean, error: string|null, statusCode: number|null }
 */
const validateRegistrationPeriod = (registrationStartDate, registrationEndDate, submissionTime = null) => {
    const now = new Date();

    if (now.getTime() < registrationStartDate.getTime()) {
        const startDateFormatted = registrationStartDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });

        return {
            isValid: false,
            error: `Registration has not started yet. Please wait until ${startDateFormatted}.`,
            statusCode: 403
        };
    }

    if (now.getTime() > registrationEndDate.getTime()) {
        return {
            isValid: false,
            error: 'Registration period has ended. No new registrations are being accepted.',
            statusCode: 403
        };
    }

    if (submissionTime) {
        const submissionDate = new Date(submissionTime);
        if (submissionDate.getTime() > registrationEndDate.getTime()) {
            return {
                isValid: false,
                error: 'Registration period has ended. Submission timestamp is invalid.',
                statusCode: 403
            };
        }
    }

    return {
        isValid: true,
        error: null,
        statusCode: null
    };
};

module.exports = {
    getEventStatus,
    validateRegistrationPeriod
};
