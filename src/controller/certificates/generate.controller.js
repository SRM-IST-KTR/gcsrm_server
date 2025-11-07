const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Event = require('../../models/event.model');
const IssuedCertificate = require('../../models/certificate.model');
const { getParticipantModel } = require('../../models/participant.model');
const { connectDB } = require('../../utils/db');
const textOverlay = require('../../utils/certificates/overlay-sharp');
const Sentry = require('@sentry/node');

const generateCertificate = async (req, res) => {
    const startTime = Date.now();

    try {
        // Check for validation errors from express-validator
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            Sentry.captureMessage('Certificate generation validation failed', {
                level: 'warning',
                tags: {
                    operation: 'generateCertificate',
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
                details: errors.array()
            });
        }

        const { email, event, type, format } = req.body;

        // Log operation start with context
        Sentry.setContext('certificate_request', {
            email,
            event,
            type,
            format: format || 'base64',
            ip: req.ip || req.connection?.remoteAddress
        });

        Sentry.logger.info('Generating certificate', {
            operation: 'generateCertificate',
            email,
            event,
            type,
            format: format || 'base64'
        });

        // Supported formats: 'base64' (default), 'image', 'pdf'
        const responseFormat = (format || 'base64').toLowerCase();

        if (mongoose.connection.readyState !== 1) {
            await connectDB();
        }

        const eventData = await Event.findOne({ slug: event }).lean();
        if (!eventData) {
            Sentry.captureMessage('Event not found for certificate generation', {
                level: 'warning',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: { email, type }
            });

            return res.status(404).json({ success: false, error: `Event not found with slug: ${event}` });
        }

        if (!eventData.jimp_config) {
            Sentry.captureMessage('Missing jimp_config in event data', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: { eventData: eventData._id }
            });

            return res.status(500).json({ success: false, error: 'jimp_config is missing from eventData' });
        }

        const normalizedType = type.toLowerCase();

        // Map plural collection names to singular certificate types for enum validation
        const certificateTypeMap = {
            'participants': 'participant',
            'organizers': 'organizer',
            'volunteers': 'volunteer',
            'speakers': 'speaker',
            'winners': 'winner'
        };

        const certificateType = certificateTypeMap[normalizedType] || normalizedType;

        const certificateURL = eventData.certificate[normalizedType];
        if (!certificateURL) {
            Sentry.captureMessage('Certificate template not found', {
                level: 'warning',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event,
                    certificateType: normalizedType
                },
                extra: { email }
            });

            return res.status(404).json({ success: false, error: `Certificate not found for type: ${normalizedType}` });
        }

        const db = mongoose.connection.useDb(eventData.database);

        // Use the getParticipantModel function to avoid redefining schema on every request
        const User = getParticipantModel(db, eventData.collection[type]);
        const userData = await User.findOne({ email }).lean();
        if (!userData) {
            Sentry.captureMessage('User not found for certificate generation', {
                level: 'warning',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event,
                    certificateType: normalizedType
                },
                extra: { email }
            });

            return res.status(404).json({ success: false, error: `No certificate found for email: ${email}` });
        }

        const color = typeof eventData.jimp_config.color === 'string'
            ? eventData.jimp_config.color.toUpperCase()
            : 'WHITE';

        const fontSize = eventData.jimp_config.font_size || '64';
        const yOffset = eventData.jimp_config.yOffset || '380';

        const fontFamilyKey = (eventData.jimp_config.font_family || '').toString().trim();
        if (!fontFamilyKey) {
            Sentry.captureMessage('Missing font_family in jimp_config', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                }
            });

            return res.status(500).json({ success: false, error: 'jimp_config.font_family is required for dynamic font resolution' });
        }

        const familyFontEntry = eventData.jimp_config.fonts && eventData.jimp_config.fonts[fontFamilyKey];
        if (!familyFontEntry) {
            Sentry.captureMessage('Font URL not found in jimp_config.fonts', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: { fontFamilyKey }
            });

            return res.status(500).json({ success: false, error: `Font URL for family '${fontFamilyKey}' not found in jimp_config.fonts` });
        }

        // If the family entry is an object with specific keys, prefer its FONT_* entries; otherwise
        // if it's a string, use the same URL for all keys.
        const jimpOptions = {};
        const fontUrlFromFamily = (typeof familyFontEntry === 'string') ? familyFontEntry : null;
        const familyMap = (typeof familyFontEntry === 'object') ? familyFontEntry : {};

        jimpOptions[`FONT_${fontSize}_WHITE`] = familyMap[`FONT_${fontSize}_WHITE`] || fontUrlFromFamily || null;
        jimpOptions[`FONT_${fontSize}_BLACK`] = familyMap[`FONT_${fontSize}_BLACK`] || fontUrlFromFamily || null;
        jimpOptions['FONT_32_WHITE'] = familyMap['FONT_32_WHITE'] || fontUrlFromFamily || null;
        jimpOptions['FONT_32_BLACK'] = familyMap['FONT_32_BLACK'] || fontUrlFromFamily || null;

        // If required font URLs are still missing, return an error.
        if (!jimpOptions[`FONT_${fontSize}_WHITE`] || !jimpOptions[`FONT_${fontSize}_BLACK`]) {
            Sentry.captureMessage('Required font URLs missing', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: { fontFamilyKey, fontSize, jimpOptions }
            });

            return res.status(500).json({ success: false, error: `Required font URLs missing for family '${fontFamilyKey}'. Provide either a string URL for the family or FONT_* keys.` });
        }

        const xOffsetConfig = eventData.jimp_config.xOffset || '0';
        const uppercaseConfig = !!eventData.jimp_config.uppercase;

        const overlayStart = Date.now();
        const overlayResult = await textOverlay(
            userData.name,
            certificateURL,
            color,
            fontSize,
            yOffset,
            xOffsetConfig,
            uppercaseConfig,
            jimpOptions
        );
        const overlayDuration = Date.now() - overlayStart;

        const { buffer, error, error_message } = overlayResult || {};
        if (error) {
            Sentry.captureException(new Error(error_message || 'Image processing failed'), {
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event,
                    stage: 'overlay'
                },
                extra: {
                    email,
                    name: userData.name,
                    overlayDuration: `${overlayDuration}ms`
                }
            });

            return res.status(500).json({ success: false, error: error_message || 'Image processing failed' });
        }

        if (!buffer) {
            Sentry.captureMessage('No image buffer returned from overlay', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: { email, name: userData.name }
            });

            return res.status(500).json({ success: false, error: 'No image buffer returned from overlay' });
        }

        // Log slow overlay operations (over 3 seconds)
        if (overlayDuration > 3000) {
            Sentry.logger.warn('Slow certificate overlay operation', {
                operation: 'generateCertificate',
                eventSlug: event,
                duration: `${overlayDuration}ms`,
                name: userData.name
            });
        }

        // Extract the actual image buffer from data URI if needed
        let imageBuffer;
        if (Buffer.isBuffer(buffer)) {
            imageBuffer = buffer;
        } else if (typeof buffer === 'string') {
            if (buffer.startsWith('data:image/png;base64,')) {
                // Remove data URI prefix and convert to buffer
                const base64Data = buffer.replace('data:image/png;base64,', '');
                imageBuffer = Buffer.from(base64Data, 'base64');
            } else {
                // Assume it's a base64 string
                imageBuffer = Buffer.from(buffer, 'base64');
            }
        } else {
            Sentry.captureMessage('Unsupported buffer type from overlay', {
                level: 'error',
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event
                },
                extra: {
                    bufferType: typeof buffer,
                    email
                }
            });

            return res.status(500).json({ success: false, error: 'Unsupported buffer type from overlay' });
        }

        // Save issued certificate for verification
        try {
            // Check if certificate already exists
            let issuedCert = await IssuedCertificate.findOne({
                participantEmail: email,
                eventSlug: event,
                certificateType: certificateType
            });

            if (!issuedCert) {
                // Generate unique certificate ID (use singular certificateType)
                const certificateId = IssuedCertificate.generateCertificateId(event, certificateType);

                // Set issue date
                const issueDate = new Date();

                // Create digital signature using HMAC-SHA256 with secret salt
                // Includes: certificateId + name + email + event + type + issueDate + secret
                const digitalSignature = IssuedCertificate.generateDigitalSignature(
                    certificateId,
                    userData.name,
                    email,
                    event,
                    certificateType,
                    issueDate
                );

                // Create new certificate record
                issuedCert = await IssuedCertificate.create({
                    certificateId,
                    participantName: userData.name,
                    participantEmail: email,
                    eventSlug: event,
                    certificateType: certificateType,
                    issueDate: issueDate,
                    digitalSignature,
                    isRevoked: false,
                    metadata: {
                        eventName: eventData.event_name,
                        generatedAt: issueDate.toISOString()
                    }
                });
            }

            const totalDuration = Date.now() - startTime;

            // Log successful certificate generation
            Sentry.logger.info('Certificate generated successfully', {
                operation: 'generateCertificate',
                eventSlug: event,
                certificateType,
                certificateId: issuedCert.certificateId,
                format: responseFormat,
                totalDuration: `${totalDuration}ms`
            });

            // Log slow generation (over 5 seconds)
            if (totalDuration > 5000) {
                Sentry.logger.warn('Slow certificate generation', {
                    operation: 'generateCertificate',
                    eventSlug: event,
                    duration: `${totalDuration}ms`,
                    certificateId: issuedCert.certificateId
                });
            }

            // Handle different response formats
            if (responseFormat === 'image') {
                // Return raw PNG image
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Disposition', `inline; filename="certificate-${issuedCert.certificateId}.png"`);
                res.setHeader('X-Certificate-Id', issuedCert.certificateId);
                res.setHeader('X-Certificate-Name', userData.name);
                res.setHeader('X-Issue-Date', issuedCert.issueDate.toISOString());
                return res.send(imageBuffer);
            } else if (responseFormat === 'pdf') {
                // Convert PNG to PDF (single page)
                const PDFDocument = require('pdfkit');
                const sharp = require('sharp');

                // Get image metadata for proper sizing
                const metadata = await sharp(imageBuffer).metadata();
                const imageWidth = metadata.width;
                const imageHeight = metadata.height;

                // Calculate PDF dimensions (A4 landscape or custom size based on image)
                // Convert pixels to points (1 point = 1/72 inch, typical screen DPI = 96)
                const pageWidth = imageWidth * 0.75; // 96 DPI to 72 DPI conversion
                const pageHeight = imageHeight * 0.75;

                // Create PDF document with custom page size
                const pdfDoc = new PDFDocument({
                    size: [pageWidth, pageHeight],
                    margins: { top: 0, bottom: 0, left: 0, right: 0 }
                });

                // Set response headers for PDF
                res.setHeader('Content-Type', 'application/pdf');
                res.setHeader('Content-Disposition', `inline; filename="certificate-${issuedCert.certificateId}.pdf"`);
                res.setHeader('X-Certificate-Id', issuedCert.certificateId);
                res.setHeader('X-Certificate-Name', userData.name);
                res.setHeader('X-Issue-Date', issuedCert.issueDate.toISOString());

                // Pipe PDF to response
                pdfDoc.pipe(res);

                // Add certificate image to PDF (full page)
                pdfDoc.image(imageBuffer, 0, 0, {
                    width: pageWidth,
                    height: pageHeight
                });

                // Add metadata to PDF
                pdfDoc.info.Title = `Certificate - ${userData.name}`;
                pdfDoc.info.Subject = `Certificate of ${certificateType} for ${eventData.event_name}`;
                pdfDoc.info.Author = 'GCSRM Certificate System';
                pdfDoc.info.Creator = 'GCSRM Server';
                pdfDoc.info.Keywords = `certificate,${event},${certificateType},${issuedCert.certificateId}`;

                // Finalize PDF
                pdfDoc.end();

                return; // Response already sent via pipe
            } else {
                // Default: return base64 JSON response
                const base64 = imageBuffer.toString('base64');
                const dataUri = `data:image/png;base64,${base64}`;

                return res.status(200).json({
                    success: true,
                    certificate: dataUri,
                    name: userData.name,
                    certificateId: issuedCert.certificateId,
                    issueDate: issuedCert.issueDate,
                    format: 'base64'
                });
            }
        } catch (certSaveError) {
            console.error('Certificate save error:', certSaveError);

            Sentry.captureException(certSaveError, {
                tags: {
                    operation: 'generateCertificate',
                    eventSlug: event,
                    stage: 'save_certificate'
                },
                extra: {
                    email,
                    name: userData.name,
                    certificateType
                }
            });

            // Still return the certificate even if saving fails
            if (responseFormat === 'image') {
                res.setHeader('Content-Type', 'image/png');
                res.setHeader('Content-Disposition', `inline; filename="certificate-${userData.name.replace(/\s+/g, '-')}.png"`);
                res.setHeader('X-Certificate-Name', userData.name);
                res.setHeader('X-Warning', 'Certificate generated but verification record could not be saved');
                return res.send(imageBuffer);
            } else {
                const base64 = imageBuffer.toString('base64');
                const dataUri = `data:image/png;base64,${base64}`;

                return res.status(200).json({
                    success: true,
                    certificate: dataUri,
                    name: userData.name,
                    format: 'base64',
                    warning: 'Certificate generated but verification record could not be saved'
                });
            }
        }
    } catch (err) {
        console.error('Certificate generation error:', err);

        Sentry.captureException(err, {
            tags: {
                operation: 'generateCertificate',
                eventSlug: req.body?.event,
                certificateType: req.body?.type
            },
            extra: {
                email: req.body?.email,
                format: req.body?.format
            }
        });

        return res.status(500).json({ success: false, error: 'Internal Server Error' });
    }
};

module.exports = { generateCertificate };