const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const Event = require('../models/event.model');
const { connectDB } = require('../utils/db');

// We'll dynamically load a jimp overlay implementation.
// Prefer a user-provided root-level `jimpOverlay.js` (ESM), otherwise fall back to the server-side CommonJS helper.
async function loadTextOverlay() {
  const userOverlay = path.resolve(__dirname, '..', '..', 'jimpOverlay.js');
  if (fs.existsSync(userOverlay)) {
    // dynamic import of ESM file
    const mod = await import(pathToFileURL(userOverlay).href);
    return mod.default || mod;
  }

  // fallback to internal CommonJS implementation
  // eslint-disable-next-line global-require
  return require('../utils/certificates/jimpOverlay');
}

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
    const jimpOptions = {
      FONT_64_WHITE: eventData.jimp_config.fonts?.FONT_64_WHITE || 'https://ik.imagekit.io/githubsrm/fonts/open-sans-64-white/open-sans-64-white.fnt',
      FONT_64_BLACK: eventData.jimp_config.fonts?.FONT_64_BLACK || 'https://ik.imagekit.io/githubsrm/fonts/open-sans-64-black/open-sans-64-black.fnt',
      FONT_32_WHITE: eventData.jimp_config.fonts?.FONT_32_WHITE || 'https://ik.imagekit.io/githubsrm/fonts/open-sans-32-white/open-sans-32-white.fnt',
      FONT_32_BLACK: eventData.jimp_config.fonts?.FONT_32_BLACK || 'https://ik.imagekit.io/githubsrm/fonts/open-sans-32-black/open-sans-32-black.fnt'
    };

    const textOverlay = await loadTextOverlay();
    const overlayResult = await textOverlay(
      userData.name,
      certificateURL,
      color,
      fontSize,
      yOffset,
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
