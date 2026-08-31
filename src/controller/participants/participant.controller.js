const { connectDB } = require('../../utils/db');
const getParticipantModel = require('../../models/participant.model');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');

/**
 * Check if a participant exists by email
 */
const getParticipantByEmail = async (req, res, next) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        const email = req.query.email?.trim().toLowerCase();
        
        if (!email) {
            return res.status(400).json({ success: false, error: "Email is required." });
        }

        const conn = await connectDB();
        const ParticipantUser = getParticipantModel(conn);

        const participant = await ParticipantUser.findOne({ email }).lean();
        
        return res.status(200).json({
            success: true,
            exists: Boolean(participant),
            user: participant || null,
        });
    } catch (error) {
        console.error("[getParticipantByEmail] Error:", error);
        Sentry.captureException(error, {
            tags: { operation: 'getParticipantByEmail' },
            extra: { email: req.query.email }
        });
        return res.status(500).json({ success: false, error: "Unable to verify email." });
    }
};

/**
 * Register a new participant
 */
const registerParticipant = async (req, res, next) => {
    const startTime = Date.now();

    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Participant registration validation failed', {
                level: 'warning',
                tags: { operation: 'registerParticipant', validation: 'failed' },
                extra: { errors: errors.array(), body: req.body }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                errors: errors.array().map(err => ({
                    field: err.path || err.param,
                    message: err.msg
                }))
            });
        }

        const conn = await connectDB();
        const ParticipantUser = getParticipantModel(conn);

        const now = new Date();
        const startDate = new Date(2026, 7, 25, 0, 0, 0);
        const endDate = new Date(2026, 7, 30, 23, 59, 59);

        if (now.getTime() < startDate.getTime()) {
            return res.status(403).json({
                success: false,
                error: "Registration has not started yet. Please wait until August 25, 2026."
            });
        }

        if (now.getTime() > endDate.getTime()) {
            return res.status(403).json({
                success: false,
                error: "Registration period has ended. No new registrations are being accepted."
            });
        }

        if (req.body.submissionTime) {
            const submissionTime = new Date(req.body.submissionTime);
            if (submissionTime.getTime() > endDate.getTime()) {
                return res.status(403).json({
                    success: false,
                    error: "Registration period has ended. Submission timestamp is invalid."
                });
            }
        }

        const {
            submissionTime,
            name,
            email,
            registrationNumber,
            phone,
            year,
            domain,
            degreeWithBranch,
            ...rest
        } = req.body;

        const links = req.body.links || {};
        const { github, demo, deployment } = links;

        if (!name || !email || !registrationNumber || !phone || !year || !domain || !degreeWithBranch) {
            return res.status(400).json({
                success: false,
                error: "All required fields are required."
            });
        }

        const existingUser = await ParticipantUser.findOne({
            $or: [{ email }, { registrationNumber }],
        });

        if (existingUser) {
            return res.status(400).json({
                success: false,
                error: existingUser.email === email
                    ? "This email address is already registered."
                    : "This registration number is already registered.",
            });
        }

        Sentry.setContext('participant_registration', {
            name, email, registrationNumber, domain, year,
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Processing participant registration', {
            operation: 'registerParticipant',
            email, registrationNumber, domain, year
        });

        const participant = await ParticipantUser.create({
            name,
            email,
            registrationNumber,
            phone,
            year,
            domain,
            degreeWithBranch,
            links: {
                github: github || null,
                demo: demo || null,
                deployment: deployment || null,
            },
            status: "registered",
            ...rest,
        });

        Sentry.logger.info('Participant registration successful', {
            operation: 'registerParticipant',
            userId: participant._id.toString(),
            email: participant.email,
            totalDuration: `${Date.now() - startTime}ms`
        });

        return res.status(201).json({
            success: true,
            user: participant,
        });
    } catch (error) {
        console.error("Registration error:", error);

        if (error.code === 11000) {
            const message = error.message || "";
            if (message.includes("regNo_1") || message.includes("registrationNumber")) {
                return res.status(400).json({ success: false, error: "This registration number is already registered." });
            }
            if (message.includes("email")) {
                return res.status(400).json({ success: false, error: "This email address is already registered." });
            }
        }

        if (error.name === 'ValidationError') {
            const validationErrors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));

            return res.status(400).json({
                success: false,
                error: 'Validation error',
                errors: validationErrors
            });
        }

        Sentry.captureException(error, {
            tags: { operation: 'registerParticipant' },
            extra: { requestBody: req.body, errorMessage: error.message }
        });

        return res.status(400).json({
            success: false,
            error: error.message || "Failed to register participant."
        });
    }
};

module.exports = {
    getParticipantByEmail,
    registerParticipant
};
