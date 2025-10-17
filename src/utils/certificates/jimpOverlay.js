const Jimp = require('jimp-compact');

/**
 * Text overlay function using jimp-compact.
 * - name: text to render
 * - url: URL or local path to base certificate image
 * - color: expected string (e.g. 'WHITE' or 'BLACK')
 * - font_size: '64' or '32' (string or number)
 * - yOffset: vertical position for text
 * - jimpOptions: object with FONT_* keys mapping to font file URLs or paths
 *
 * Returns { buffer: <dataURI string>, error: boolean, error_message: string }
 */
module.exports = async function textOverlay(name, url, color, font_size, yOffset, jimpOptions = {}) {
  try {
    if (!color || !font_size || !yOffset) {
      return {
        buffer: null,
        error: true,
        error_message: 'Missing required image config values.'
      };
    }

    const fontKey = `FONT_${font_size}_${String(color).toUpperCase()}`;

    if (!jimpOptions || !jimpOptions[fontKey]) {
      return {
        buffer: null,
        error: true,
        error_message: `Invalid font combination: ${fontKey}`
      };
    }

    const font = await Jimp.loadFont(jimpOptions[fontKey]);
    const image = await Jimp.read(url);
    // Resize to a reasonable width while preserving aspect ratio
    if (typeof image.scaleToFit === 'function') {
      image.scaleToFit(1300, Jimp.AUTO, Jimp.RESIZE_BEZIER);
    }

    image.print(
      font,
      0,
      parseInt(yOffset, 10),
      {
        text: String(name || ''),
        alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
        alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
      },
      1300,
      900
    );

    const bufferImage = await image.getBase64Async(Jimp.MIME_PNG);
    return { buffer: bufferImage, error: false, error_message: 'Success' };
  } catch (error) {
    console.error('jimpOverlay error:', error);
    return {
      buffer: null,
      error: true,
      error_message: error && error.message ? error.message : 'Failed'
    };
  }
};
