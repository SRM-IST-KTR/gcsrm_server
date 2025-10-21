const mongoose = require('mongoose');
const { connectDB_recruitment } = require('../../utils/db');
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
            Sentry.captureMessage('Recruitment application validation failed', {
                level: 'warning',
                tags: {
                    operation: 'applyForRecruitment',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    body: req.body
                }
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

        // Connect to database
        const recruitmentConn = await connectDB_recruitment();
        const ParticipantUser = getParticipantUserModel(recruitmentConn);

        // Server-side registration period validation
        const now = new Date();
        const startDate = new Date(2025, 7, 25, 0, 0, 0); // August 25, 2025 at 00:00:00
        const endDate = new Date(2025, 7, 30, 23, 59, 59); // August 30, 2025 at 23:59:59

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
                error: 'Registration has not started yet. Please wait until August 25, 2025.'
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
        console.error('[applyForRecruitment] Error:', error);

        // Handle specific MongoDB errors
        if (error.code === 11000) {
            // Duplicate key error
            let errorMessage = 'This information is already registered.';
            let field = 'unknown';

            if (error.message.includes('regNo_1')) {
                errorMessage = 'Database configuration error. Please contact support.';
                field = 'regNo';

                Sentry.captureException(error, {
                    tags: {
                        operation: 'applyForRecruitment',
                        errorType: 'duplicate_key',
                        field: 'regNo_deprecated'
                    },
                    extra: {
                        errorCode: error.code,
                        keyPattern: error.keyPattern
                    }
                });

                return res.status(500).json({
                    success: false,
                    error: errorMessage
                });
            } else if (error.message.includes('registrationNumber')) {
                errorMessage = 'This registration number is already registered.';
                field = 'registrationNumber';
            } else if (error.message.includes('email')) {
                errorMessage = 'This email address is already registered.';
                field = 'email';
            }

            Sentry.captureMessage('Duplicate recruitment application', {
                level: 'info',
                tags: {
                    operation: 'applyForRecruitment',
                    errorType: 'duplicate_key',
                    field
                },
                extra: {
                    email: req.body?.email,
                    registrationNumber: req.body?.registrationNumber
                }
            });

            return res.status(400).json({
                success: false,
                error: errorMessage,
                field
            });
        }

        // Handle validation errors
        if (error.name === 'ValidationError') {
            const validationErrors = Object.keys(error.errors).map(key => ({
                field: key,
                message: error.errors[key].message
            }));

            Sentry.captureMessage('Recruitment application validation error', {
                level: 'warning',
                tags: {
                    operation: 'applyForRecruitment',
                    errorType: 'validation_error'
                },
                extra: {
                    validationErrors,
                    requestBody: req.body
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation error',
                errors: validationErrors
            });
        }

        // Capture unexpected errors
        Sentry.captureException(error, {
            tags: {
                operation: 'applyForRecruitment'
            },
            extra: {
                requestBody: req.body,
                errorMessage: error.message,
                errorStack: error.stack
            }
        });

        return res.status(400).json({
            success: false,
            error: error.message || 'An error occurred while processing your application.'
        });
    }
};

module.exports = {
    applyForRecruitment
};
