const mongoose = require('mongoose');
const { connectDB } = require('../../utils/db');
const OssomeHacks = require('../../models/ossomehacks.model');
const Sentry = require('@sentry/node');
const { getOssomeHacksStatus, validateRegistrationPeriod } = require('../../utils/hackStatusHelper');

/**
 * Register a new participant for OssomeHacks
 * POST /ossomehacks/register
 */
const registerParticipant = async (req, res) => {
    const startTime = Date.now();

    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        // Get registration status using reusable helper
        let hackStatus;
        try {
            hackStatus = await getOssomeHacksStatus();
        } catch (error) {
            if (error.statusCode === 404) {
                Sentry.captureMessage('OssomeHacks event not found in database', {
                    level: 'error',
                    tags: {
                        operation: 'registerParticipant'
                    }
                });

                return res.status(500).json({
                    success: false,
                    error: 'Event configuration not found. Please contact support.'
                });
            }
            throw error;
        }

        const registrationData = req.body;

        // Validate registration period using reusable helper
        const periodValidation = validateRegistrationPeriod(
            hackStatus.registrationStartDate,
            hackStatus.registrationEndDate,
            registrationData.submissionTime
        );

        if (!periodValidation.isValid) {
            Sentry.logger.info('Registration attempted outside valid period', {
                operation: 'registerParticipant',
                status: hackStatus.status,
                attemptTime: new Date()
            });

            return res.status(periodValidation.statusCode).json({
                success: false,
                error: periodValidation.error
            });
        }

        // Remove submissionTime from registrationData before saving to database
        const { submissionTime, ...cleanedRegistrationData } = registrationData;

        Sentry.logger.info('Processing OssomeHacks registration', {
            operation: 'registerParticipant',
            email: cleanedRegistrationData.email,
            school: cleanedRegistrationData.school
        });

        // Check if email already exists
        const existingParticipant = await OssomeHacks.findOne({
            email: cleanedRegistrationData.email.toLowerCase().trim()
        });

        if (existingParticipant) {
            Sentry.captureMessage('Duplicate registration attempt', {
                level: 'info',
                tags: {
                    operation: 'registerParticipant',
                    reason: 'duplicate_email'
                },
                extra: {
                    email: cleanedRegistrationData.email
                }
            });

            return res.status(409).json({
                success: false,
                error: 'This email is already registered for OssomeHacks'
            });
        }

        // Validate MLH checkboxes
        if (!cleanedRegistrationData.mlhCodeOfConductAgreed) {
            return res.status(400).json({
                success: false,
                error: 'You must agree to the MLH Code of Conduct to register'
            });
        }

        if (!cleanedRegistrationData.mlhPrivacyPolicyAgreed) {
            return res.status(400).json({
                success: false,
                error: 'You must agree to share your information with MLH to register'
            });
        }

        // Validate gender self-describe field
        if (cleanedRegistrationData.gender === 'Prefer to self-describe' && !cleanedRegistrationData.genderSelfDescribe) {
            return res.status(400).json({
                success: false,
                error: 'Please provide a gender description'
            });
        }

        // Validate pronouns other field
        if (cleanedRegistrationData.pronouns === 'Other' && !cleanedRegistrationData.pronounsOther) {
            return res.status(400).json({
                success: false,
                error: 'Please provide your pronouns'
            });
        }

        // Create new registration
        const newRegistration = new OssomeHacks(cleanedRegistrationData);
        const savedRegistration = await newRegistration.save();

        const totalDuration = Date.now() - startTime;

        Sentry.logger.info('OssomeHacks registration successful', {
            operation: 'registerParticipant',
            registrationId: savedRegistration._id.toString(),
            email: savedRegistration.email,
            school: savedRegistration.school,
            duration: `${totalDuration}ms`
        });

        // Send confirmation email (optional - implement later)
        // try {
        //     await sendRegistrationConfirmationEmail(savedRegistration);
        // } catch (emailError) {
        //     Sentry.captureException(emailError, {
        //         tags: { operation: 'registerParticipant', subOperation: 'sendEmail' }
        //     });
        // }

        res.status(201).json({
            success: true,
            message: 'Registration successful! Welcome to OssomeHacks!',
            data: {
                registrationId: savedRegistration._id,
                fullName: savedRegistration.fullName,
                email: savedRegistration.email,
                registrationStatus: savedRegistration.registrationStatus,
                registeredAt: savedRegistration.registeredAt
            }
        });

    } catch (error) {
        // Handle validation errors
        if (error.name === 'ValidationError') {
            const errors = Object.values(error.errors).map(err => err.message);

            Sentry.captureMessage('Registration validation failed', {
                level: 'warning',
                tags: {
                    operation: 'registerParticipant',
                    errorType: 'validation'
                },
                extra: {
                    errors: errors
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors
            });
        }

        // Handle duplicate key error
        if (error.code === 11000) {
            Sentry.captureMessage('Duplicate key error during registration', {
                level: 'warning',
                tags: {
                    operation: 'registerParticipant',
                    errorType: 'duplicate_key'
                }
            });

            return res.status(409).json({
                success: false,
                error: 'This email is already registered'
            });
        }

        Sentry.captureException(error, {
            tags: {
                operation: 'registerParticipant'
            },
            extra: {
                body: req.body
            }
        });

        res.status(500).json({
            success: false,
            error: 'An error occurred during registration. Please try again.'
        });
    }
};

/**
 * Get registration by ID
 * GET /ossomehacks/registrations/:id
 */
const getRegistrationById = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid registration ID format'
            });
        }

        const registration = await OssomeHacks.findById(id).lean();

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        Sentry.logger.info('Registration fetched', {
            operation: 'getRegistrationById',
            registrationId: id
        });

        res.status(200).json({
            success: true,
            data: registration
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'getRegistrationById',
                registrationId: req.params.id
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/**
 * Get registration by email
 * GET /ossomehacks/registrations/email/:email
 */
const getRegistrationByEmail = async (req, res) => {
    try {
        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const { email } = req.params;

        const registration = await OssomeHacks.findOne({
            email: email.toLowerCase().trim()
        }).lean();

        if (!registration) {
            return res.status(404).json({
                success: false,
                error: 'Registration not found'
            });
        }

        res.status(200).json({
            success: true,
            data: registration
        });

    } catch (error) {
        Sentry.captureException(error, {
            tags: {
                operation: 'getRegistrationByEmail'
            }
        });

        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    registerParticipant,
    getRegistrationById,
    getRegistrationByEmail
};
