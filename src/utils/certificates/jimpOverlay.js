const Jimp = require('jimp');

/**
 * Simple text overlay function using Jimp.
 * - name: text to render
 * - certificateURL: URL or local path to base certificate image
 * - color: 'WHITE' or 'BLACK'
 * - fontSize: '64' or '32' (string or number)
 * - yOffset: vertical position for text
 * - jimpOptions: object with FONT_* URLs (optional)
 *
 * Returns { buffer: <Buffer>, error: boolean, error_message: string }
 */
module.exports = async function textOverlay(name, certificateURL, color = 'WHITE', fontSize = '64', yOffset = '380', jimpOptions = {}) {
  try {
    // Load image from URL or file path
    const image = await Jimp.read(certificateURL);

    // Choose font
    let fontPath;
    const sizeKey = `FONT_${fontSize}`;
    // use provided fonts map if available, else use built-in Jimp fonts
    if (jimpOptions && jimpOptions[`FONT_${fontSize}_${color}`]) {
      fontPath = jimpOptions[`FONT_${fontSize}_${color}`];
    }

    // Fallback to Jimp built-in fonts
    if (!fontPath) {
      if (fontSize.toString().startsWith('32')) {
        fontPath = color === 'WHITE' ? Jimp.FONT_SANS_32_WHITE : Jimp.FONT_SANS_32_BLACK;
      } else {
        fontPath = color === 'WHITE' ? Jimp.FONT_SANS_64_WHITE : Jimp.FONT_SANS_64_BLACK;
      }
    }

    const font = await Jimp.loadFont(fontPath);

    // Measure text width and center horizontally
    const text = String(name || '');
    const imageWidth = image.getWidth();

    // calculate x such that text is horizontally centered
    const textWidth = Jimp.measureText(font, text);
    const x = Math.max(20, (imageWidth - textWidth) / 2);
    const y = parseInt(yOffset, 10) || Math.floor(image.getHeight() * 0.6);

    // Print text
    image.print(font, x, y, text);

    const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
    return { buffer, error: false };
  } catch (err) {
    console.error('jimpOverlay error:', err);
    return { buffer: null, error: true, error_message: err.message || 'Image processing failed' };
  }
};
