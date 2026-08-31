const mongoose = require('mongoose');
const { connectRecruitmentDB } = require('../../utils/db');
const getParticipantUserModel = require('../../models/recruitment.model');
const Sentry = require('@sentry/node');
const { validationResult } = require('express-validator');

/**
 * Apply for recruitment
 * Handles participant registration with validation and time-based restrictions
 */
const applyForRecruitment = async (req, res, next) => {
    const startTime = Date.now();

    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Validation errors during recruitment application', {
                level: 'warning',
                tags: {
                    operation: 'applyForRecruitment',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    requestBody: {
                        name: req.body.name,
                        email: req.body.email,
                        registrationNumber: req.body.registrationNumber,
                        domain: req.body.domain,
                        year: req.body.year
                    }
                }
            });

            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        // Connect to recruitment database
        const recruitmentConn = await connectRecruitmentDB();
        const ParticipantUser = getParticipantUserModel(recruitmentConn);

        // Server-side registration period validation with env support
        const now = new Date();
        const startDate = process.env.RECRUITMENT_START_DATE
            ? new Date(process.env.RECRUITMENT_START_DATE)
            : new Date('2026-08-01T00:00:00.000Z');
        const endDate = process.env.RECRUITMENT_END_DATE
            ? new Date(process.env.RECRUITMENT_END_DATE)
            : new Date('2026-12-31T23:59:59.999Z');

        // Check if registration period is active
        if (now.getTime() < startDate.getTime()) {
            Sentry.captureMessage('Recruitment application too early', {
                level: 'info',
                tags: {
                    operation: 'applyForRecruitment',
                    validation: 'registration_not_started'
                },
                extra: {
                    currentTime: now.toISOString(),
                    startDate: startDate.toISOString()
                }
            });

            return res.status(403).json({
                success: false,
                error: `Registration has not started yet. Please wait until ${startDate.toDateString()}.`
            });
        }

        if (now.getTime() > endDate.getTime()) {
            Sentry.captureMessage('Recruitment application too late', {
                level: 'info',
                tags: {
                    operation: 'applyForRecruitment',
                    validation: 'registration_ended'
                },
                extra: {
                    currentTime: now.toISOString(),
                    endDate: endDate.toISOString()
                }
            });

            return res.status(403).json({
                success: false,
                error: 'Registration period has ended. No new registrations are being accepted.'
            });
        }

        // Additional validation: Check if submissionTime was provided and is within valid range
        if (req.body.submissionTime) {
            const submissionTime = new Date(req.body.submissionTime);
            if (submissionTime.getTime() > endDate.getTime()) {
                Sentry.captureMessage('Invalid submission timestamp', {
                    level: 'warning',
                    tags: {
                        operation: 'applyForRecruitment',
                        validation: 'invalid_submission_time'
                    },
                    extra: {
                        submissionTime: submissionTime.toISOString(),
                        endDate: endDate.toISOString()
                    }
                });

                return res.status(403).json({
                    success: false,
                    error: 'Registration period has ended. Submission timestamp is invalid.'
                });
            }
        }

        // Remove submissionTime from body before saving to database
        const { submissionTime, ...userData } = req.body;

        // Set context for Sentry
        Sentry.setContext('recruitment_application', {
            name: userData.name,
            email: userData.email,
            registrationNumber: userData.registrationNumber,
            domain: userData.domain,
            year: userData.year,
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Processing recruitment application', {
            operation: 'applyForRecruitment',
            email: userData.email,
            registrationNumber: userData.registrationNumber,
            domain: userData.domain,
            year: userData.year
        });

        // Create new participant
        const queryStart = Date.now();
        const user = await ParticipantUser.create(userData);
        const queryDuration = Date.now() - queryStart;

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('Recruitment application successful', {
            operation: 'applyForRecruitment',
            userId: user._id.toString(),
            email: user.email,
            registrationNumber: user.registrationNumber,
            domain: user.domain,
            year: user.year,
            queryDuration: `${queryDuration}ms`,
            totalDuration: `${totalDuration}ms`
        });

        // Log slow database operations (over 500ms)
        if (queryDuration > 500) {
            Sentry.logger.warn('Slow database operation', {
                operation: 'applyForRecruitment',
                action: 'create_participant',
                duration: `${queryDuration}ms`
            });
        }

        return res.status(201).json({
            success: true,
            message: 'Application submitted successfully! You will receive further instructions via email.',
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                registrationNumber: user.registrationNumber,
                domain: user.domain,
                year: user.year,
                status: user.status,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        const totalDuration = Date.now() - startTime;

        Sentry.captureException(error, {
            tags: {
                operation: 'applyForRecruitment',
                component: 'controller'
            },
            extra: {
                requestBody: {
                    name: req.body.name,
                    email: req.body.email,
                    registrationNumber: req.body.registrationNumber,
                    domain: req.body.domain,
                    year: req.body.year
                },
                totalDuration: `${totalDuration}ms`
            }
        });

        Sentry.logger.error('Recruitment application failed', {
            error: error.message,
            stack: error.stack,
            totalDuration: `${totalDuration}ms`
        });

        // Duplicate key handling
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern || {})[0] || 'field';
            return res.status(409).json({
                success: false,
                error: `A participant with this ${field} already exists.`
            });
        }

        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error'
        });
    }
};

module.exports = {
    applyForRecruitment
};
