const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');
const { validationResult } = require('express-validator');
const Event = require('../models/event.model');
const IssuedCertificate = require('../models/certificate.model');
const { connectDB } = require('../utils/db');
const textOverlay = require('../utils/certificates/overlay-sharp');

const generateCertificate = async (req, res) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { email, event, type, format } = req.body;

    // Supported formats: 'base64' (default), 'image', 'pdf'
    const responseFormat = (format || 'base64').toLowerCase();

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const eventData = await Event.findOne({ slug: event });
    if (!eventData) {
      return res.status(404).json({ success: false, error: `Event not found with slug: ${event}` });
    }

    if (!eventData.jimp_config) {
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
      return res.status(404).json({ success: false, error: `Certificate not found for type: ${normalizedType}` });
    }

    const db = mongoose.connection.useDb(eventData.database);
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true },
      checkin: { type: Boolean, default: false }
    }, { suppressReservedKeysWarning: true });

    const User = db.model(eventData.collection[type], userSchema);
    const userData = await User.findOne({ email });
    if (!userData) {
      return res.status(404).json({ success: false, error: `No certificate found for email: ${email}` });
    }

    const color = typeof eventData.jimp_config.color === 'string'
      ? eventData.jimp_config.color.toUpperCase()
      : 'WHITE';

    const fontSize = eventData.jimp_config.font_size || '64';
    const yOffset = eventData.jimp_config.yOffset || '380';

    const fontFamilyKey = (eventData.jimp_config.font_family || '').toString().trim();
    if (!fontFamilyKey) {
      return res.status(500).json({ success: false, error: 'jimp_config.font_family is required for dynamic font resolution' });
    }

    const familyFontEntry = eventData.jimp_config.fonts && eventData.jimp_config.fonts[fontFamilyKey];
    if (!familyFontEntry) {
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
      return res.status(500).json({ success: false, error: `Required font URLs missing for family '${fontFamilyKey}'. Provide either a string URL for the family or FONT_* keys.` });
    }

    const xOffsetConfig = eventData.jimp_config.xOffset || '0';
    const uppercaseConfig = !!eventData.jimp_config.uppercase;

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

    const { buffer, error, error_message } = overlayResult || {};
    if (error) {
      return res.status(500).json({ success: false, error: error_message || 'Image processing failed' });
    }

    if (!buffer) {
      return res.status(500).json({ success: false, error: 'No image buffer returned from overlay' });
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
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

const verifyCertificate = async (req, res) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { certificateId } = req.params;

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const certificate = await IssuedCertificate.findOne({ certificateId });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found',
        verified: false
      });
    }

    const isSignatureValid = certificate.verifySignature();

    if (!isSignatureValid) {
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
      return res.status(200).json({
        success: true,
        verified: false,
        status: 'revoked',
        message: 'This certificate has been revoked',
        revokedAt: certificate.revokedAt,
        revokedReason: certificate.revokedReason
      });
    }

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
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

const downloadCertificate = async (req, res) => {
  try {
    // Check for validation errors from express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors.array()
      });
    }

    const { certificateId } = req.params;
    const { format } = req.query; // 'png' or 'pdf'

    if (mongoose.connection.readyState !== 1) {
      await connectDB();
    }

    const certificate = await IssuedCertificate.findOne({ certificateId });

    if (!certificate) {
      return res.status(404).json({
        success: false,
        error: 'Certificate not found'
      });
    }

    // Verify signature
    if (!certificate.verifySignature()) {
      return res.status(403).json({
        success: false,
        error: 'Certificate has been tampered with and cannot be downloaded'
      });
    }

    if (certificate.isRevoked) {
      return res.status(403).json({
        success: false,
        error: 'This certificate has been revoked and cannot be downloaded',
        revokedAt: certificate.revokedAt,
        revokedReason: certificate.revokedReason
      });
    }

    const eventData = await Event.findOne({ slug: certificate.eventSlug });
    if (!eventData) {
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
      pdfDoc.info.Author = 'GCSRM Certificate System';
      pdfDoc.info.Creator = 'GCSRM Server';
      pdfDoc.info.Keywords = `certificate,${certificate.eventSlug},${certificate.certificateType},${certificateId}`;

      pdfDoc.end();

      return;
    } else {
      // Return PNG
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.png"`);
      res.setHeader('X-Certificate-Id', certificateId);
      res.setHeader('X-Certificate-Verified', 'true');
      return res.send(imageBuffer);
    }
  } catch (err) {
    console.error('Certificate download error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = {
  generateCertificate,
  verifyCertificate,
  downloadCertificate
};
