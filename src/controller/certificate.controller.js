const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const Event = require('../models/event.model');
const { connectDB } = require('../utils/db');
const textOverlay = require('../utils/certificates/overlay-sharp');

// POST /api/certificates/generate
const generateCertificate = async (req, res) => {
  try {
    const { email, event, type } = req.body;

    if (!email || !event || !type) {
      return res.status(400).json({ success: false, error: 'All fields are required.' });
    }

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
    const certificateURL = eventData.certificate[normalizedType];
    if (!certificateURL) {
      return res.status(404).json({ success: false, error: `Certificate not found for type: ${normalizedType}` });
    }

    const db = mongoose.connection.useDb(eventData.database);
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true },
      checkin: { type: Boolean, default: false }
    });

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

    // Normalize to a base64 string for the client.
    let base64;
    if (!buffer) {
      return res.status(500).json({ success: false, error: 'No image buffer returned from overlay' });
    }

    if (Buffer.isBuffer(buffer)) {
      base64 = buffer.toString('base64');
    } else if (typeof buffer === 'string') {
      // If the overlay returned a data URL (data:image/png;base64,....) return as-is.
      if (buffer.startsWith('data:')) {
        base64 = buffer; // include data URI
      } else {
        // assume it's a base64 string
        base64 = buffer;
      }
    } else {
      return res.status(500).json({ success: false, error: 'Unsupported buffer type from overlay' });
    }

    return res.status(200).json({ success: true, certificate: base64, name: userData.name });
  } catch (err) {
    console.error('Certificate generation error:', err);
    return res.status(500).json({ success: false, error: 'Internal Server Error' });
  }
};

module.exports = { generateCertificate };
