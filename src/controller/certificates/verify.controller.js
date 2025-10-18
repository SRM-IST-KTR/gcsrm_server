const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const IssuedCertificate = require('../../models/certificate.model');
const { connectDB } = require('../../utils/db');
const Sentry = require('@sentry/node');

const verifyCertificate = async (req, res) => {
    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Certificate verification validation failed', {
                level: 'warning',
                tags: {
                    operation: 'verifyCertificate',
                    validation: 'failed'
                },
                extra: {
                    errors: errors.array(),
                    params: req.params
                }
            });

            return res.status(400).json({
                success: false,
                error: 'Validation failed',
                details: errors.array()
            });
        }

        const { certificateId } = req.params;

        Sentry.setContext('certificate_verification', {
            certificateId,
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Verifying certificate', {
            operation: 'verifyCertificate',
            certificateId
        });

        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const certificate = await IssuedCertificate.findOne({ certificateId });

        if (!certificate) {
            Sentry.captureMessage('Certificate not found during verification', {
                level: 'info',
                tags: {
                    operation: 'verifyCertificate',
                    certificateId
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Certificate not found',
                verified: false
            });
        }

        const isSignatureValid = certificate.verifySignature();

        if (!isSignatureValid) {
            Sentry.captureMessage('Certificate signature verification failed - tampered', {
                level: 'warning',
                tags: {
                    operation: 'verifyCertificate',
                    certificateId,
                    status: 'tampered'
                },
                extra: {
                    participantEmail: certificate.participantEmail,
                    eventSlug: certificate.eventSlug
                }
            });

            return res.status(200).json({
                success: true,
                verified: false,
                status: 'tampered',
                message: 'Certificate data has been tampered with. Digital signature verification failed.',
                warning: 'This certificate may have been modified after issuance and cannot be trusted.',
                security: {
                    signatureVerified: false,
                    reason: 'Hash mismatch detected - certificate data has been altered'
                }
            });
        }

        if (certificate.isRevoked) {
            Sentry.logger.info('Certificate is revoked', {
                operation: 'verifyCertificate',
                certificateId,
                revokedAt: certificate.revokedAt
            });

            return res.status(200).json({
                success: true,
                verified: false,
                status: 'revoked',
                message: 'This certificate has been revoked',
                revokedAt: certificate.revokedAt,
                revokedReason: certificate.revokedReason
            });
        }

        Sentry.logger.info('Certificate verified successfully', {
            operation: 'verifyCertificate',
            certificateId,
            eventSlug: certificate.eventSlug,
            certificateType: certificate.certificateType
        });

        return res.status(200).json({
            success: true,
            verified: true,
            status: 'valid',
            certificate: {
                certificateId: certificate.certificateId,
                participantName: certificate.participantName,
                eventSlug: certificate.eventSlug,
                certificateType: certificate.certificateType,
                issueDate: certificate.issueDate,
                eventName: certificate.metadata?.eventName
            },
            security: {
                signatureVerified: true,
                message: 'Digital signature verified successfully'
            }
        });
    } catch (err) {
        console.error('Certificate verification error:', err);

        Sentry.captureException(err, {
            tags: {
                operation: 'verifyCertificate',
                certificateId: req.params?.certificateId
            }
        });

        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

module.exports = { verifyCertificate };