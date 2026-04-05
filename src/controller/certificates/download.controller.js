const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Event = require('../../models/event.model');
const IssuedCertificate = require('../../models/certificate.model');
const { connectDB } = require('../../utils/db');
const textOverlay = require('../../utils/certificates/overlay-sharp');
const Sentry = require('@sentry/node');

const downloadCertificate = async (req, res) => {
    const startTime = Date.now();

    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Certificate download validation failed', {
                level: 'warning',
                tags: {
                    operation: 'downloadCertificate',
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
        const { format } = req.query; // 'png' or 'pdf'

        Sentry.setContext('certificate_download', {
            certificateId,
            format: format || 'png',
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Downloading certificate', {
            operation: 'downloadCertificate',
            certificateId,
            format: format || 'png'
        });

        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const certificate = await IssuedCertificate.findOne({ certificateId });

        if (!certificate) {
            Sentry.captureMessage('Certificate not found for download', {
                level: 'info',
                tags: {
                    operation: 'downloadCertificate',
                    certificateId
                }
            });

            return res.status(404).json({
                success: false,
                error: 'Certificate not found'
            });
        }

        // Verify signature
        if (!certificate.verifySignature()) {
            Sentry.captureMessage('Tampered certificate download attempt blocked', {
                level: 'warning',
                tags: {
                    operation: 'downloadCertificate',
                    certificateId,
                    status: 'tampered'
                },
                extra: {
                    participantEmail: certificate.participantEmail,
                    eventSlug: certificate.eventSlug
                }
            });

            return res.status(403).json({
                success: false,
                error: 'Certificate has been tampered with and cannot be downloaded'
            });
        }

        if (certificate.isRevoked) {
            Sentry.logger.info('Revoked certificate download attempt blocked', {
                operation: 'downloadCertificate',
                certificateId,
                revokedAt: certificate.revokedAt
            });

            return res.status(403).json({
                success: false,
                error: 'This certificate has been revoked and cannot be downloaded',
                revokedAt: certificate.revokedAt,
                revokedReason: certificate.revokedReason
            });
        }

        const eventData = await Event.findOne({ slug: certificate.eventSlug }).lean();
        if (!eventData) {
            Sentry.captureMessage('Event not found for certificate download', {
                level: 'error',
                tags: {
                    operation: 'downloadCertificate',
                    certificateId,
                    eventSlug: certificate.eventSlug
                }
            });

            return res.status(404).json({ success: false, error: 'Event not found' });
        }

        const typeToCollectionMap = {
            'participant': 'participants',
            'organizer': 'organizers',
            'volunteer': 'volunteers',
            'speaker': 'speakers',
            'winner': 'winners'
        };

        const collectionType = typeToCollectionMap[certificate.certificateType] || certificate.certificateType;
        const certificateURL = eventData.certificate[collectionType];

        if (!certificateURL) {
            Sentry.captureMessage('Certificate template not found for download', {
                level: 'error',
                tags: {
                    operation: 'downloadCertificate',
                    certificateId,
                    collectionType
                },
                extra: {
                    eventSlug: certificate.eventSlug
                }
            });

            return res.status(404).json({ success: false, error: 'Certificate template not found' });
        }

        // Get font configuration
        const fontFamilyKey = (eventData.jimp_config.font_family || '').toString().trim();
        const familyFontEntry = eventData.jimp_config.fonts && eventData.jimp_config.fonts[fontFamilyKey];
        const fontUrlFromFamily = (typeof familyFontEntry === 'string') ? familyFontEntry : null;
        const familyMap = (typeof familyFontEntry === 'object') ? familyFontEntry : {};

        const fontSize = eventData.jimp_config.font_size || '64';
        const color = (eventData.jimp_config.color || 'WHITE').toUpperCase();

        const jimpOptions = {};
        jimpOptions[`FONT_${fontSize}_WHITE`] = familyMap[`FONT_${fontSize}_WHITE`] || fontUrlFromFamily || null;
        jimpOptions[`FONT_${fontSize}_BLACK`] = familyMap[`FONT_${fontSize}_BLACK`] || fontUrlFromFamily || null;
        jimpOptions['FONT_32_WHITE'] = familyMap['FONT_32_WHITE'] || fontUrlFromFamily || null;
        jimpOptions['FONT_32_BLACK'] = familyMap['FONT_32_BLACK'] || fontUrlFromFamily || null;

        // Regenerate certificate
        const overlayResult = await textOverlay(
            certificate.participantName,
            certificateURL,
            color,
            fontSize,
            eventData.jimp_config.yOffset || '380',
            eventData.jimp_config.xOffset || '0',
            !!eventData.jimp_config.uppercase,
            jimpOptions
        );

        const { buffer, error, error_message } = overlayResult || {};
        if (error) {
            Sentry.captureException(new Error(error_message || 'Failed to regenerate certificate'), {
                tags: {
                    operation: 'downloadCertificate',
                    certificateId,
                    stage: 'overlay'
                },
                extra: {
                    eventSlug: certificate.eventSlug,
                    name: certificate.participantName
                }
            });

            return res.status(500).json({ success: false, error: error_message || 'Failed to regenerate certificate' });
        }
        let imageBuffer;
        if (Buffer.isBuffer(buffer)) {
            imageBuffer = buffer;
        } else if (typeof buffer === 'string') {
            if (buffer.startsWith('data:image/png;base64,')) {
                const base64Data = buffer.replace('data:image/png;base64,', '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                imageBuffer = Buffer.from(buffer, 'base64');
            }
        }

        const downloadFormat = (format || 'png').toLowerCase();
        const filename = `certificate-${certificateId}-${certificate.participantName.replace(/\s+/g, '-')}`;

        if (downloadFormat === 'pdf') {
            const PDFDocument = require('pdfkit');
            const sharp = require('sharp');

            const metadata = await sharp(imageBuffer).metadata();
            const imageWidth = metadata.width;
            const imageHeight = metadata.height;

            const pageWidth = imageWidth * 0.75;
            const pageHeight = imageHeight * 0.75;

            const pdfDoc = new PDFDocument({
                size: [pageWidth, pageHeight],
                margins: { top: 0, bottom: 0, left: 0, right: 0 }
            });

            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.pdf"`);
            res.setHeader('X-Certificate-Id', certificateId);
            res.setHeader('X-Certificate-Verified', 'true');

            pdfDoc.pipe(res);

            pdfDoc.image(imageBuffer, 0, 0, {
                width: pageWidth,
                height: pageHeight
            });

            pdfDoc.info.Title = `Certificate - ${certificate.participantName}`;
            pdfDoc.info.Subject = `Certificate of ${certificate.certificateType} for ${certificate.eventSlug}`;
            pdfDoc.info.Author = 'GitHub Community SRM';
            pdfDoc.info.Creator = 'GCSRM Server';
            pdfDoc.info.Keywords = `certificate, ${certificate.eventSlug}, ${certificate.certificateType}, ${certificateId}, Verification: https://githubsrmist.in/verify/${certificateId}`;
            pdfDoc.info['X-Certificate-ID'] = certificateId;
            pdfDoc.info['X-Verification-URL'] = `https://githubsrmist.in/verify/${certificateId}`;

            pdfDoc.end();

            const totalDuration = Date.now() - startTime;
            Sentry.logger.info('Certificate downloaded successfully as PDF', {
                operation: 'downloadCertificate',
                certificateId,
                format: 'pdf',
                totalDuration: `${totalDuration}ms`
            });

            return;
        } else {
            // Return PNG
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Content-Disposition', `attachment; filename="${filename}.png"`);
            res.setHeader('X-Certificate-Id', certificateId);
            res.setHeader('X-Certificate-Verified', 'true');

            const totalDuration = Date.now() - startTime;
            Sentry.logger.info('Certificate downloaded successfully as PNG', {
                operation: 'downloadCertificate',
                certificateId,
                format: 'png',
                totalDuration: `${totalDuration}ms`
            });

            return res.send(imageBuffer);
        }
    } catch (err) {
        console.error('Certificate download error:', err);

        Sentry.captureException(err, {
            tags: {
                operation: 'downloadCertificate',
                certificateId: req.params?.certificateId
            },
            extra: {
                format: req.query?.format
            }
        });

        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

module.exports = { downloadCertificate };