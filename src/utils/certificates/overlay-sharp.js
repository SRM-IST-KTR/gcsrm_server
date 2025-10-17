const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Minimal fetch helper that returns a Buffer for a given URL or local path.
async function fetchBuffer(src, timeout = 8000) {
  // Local file
  if (!src || typeof src !== 'string') return null;
  if (src.startsWith('http://') || src.startsWith('https://')) {
    return new Promise((resolve, reject) => {
      const req = https.get(src, { timeout }, (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      });
      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy(new Error('Request timeout'));
        reject(new Error('Request timeout'));
      });
    });
  }

  // treat as local path
  return fs.promises.readFile(src);
}

function escapeXml(unsafe) {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * textOverlay replacement using sharp + SVG overlay.
 * Keeps the same function signature as the existing jimpOverlay to be a drop-in.
 */
module.exports = async function textOverlay(name, url, color, font_size, yOffset, xOffset = '0', uppercase = false, jimpOptions = {}) {
  try {
    if (!color || !font_size || !yOffset) {
      return { buffer: null, error: true, error_message: 'Missing required image config values.' };
    }

  const fontKey = `FONT_${font_size}_${String(color).toUpperCase()}`;
    // If font config not provided, continue with a system sans-serif fallback.
    if (!jimpOptions || !jimpOptions[fontKey]) {
      // do not error — many environments may rely on system fonts
      // we'll proceed without embedding a custom font
    }

    // Load base image
    let baseBuffer;
    try {
      baseBuffer = await fetchBuffer(url);
    } catch (err) {
      return { buffer: null, error: true, error_message: `Failed to load base image: ${err.message}` };
    }

  const image = sharp(baseBuffer);
  const meta = await image.metadata();
  // Match Jimp.scaleToFit(1300, Jimp.AUTO) behavior by resizing width to 1300 (allow enlargement to match previous behavior)
  const targetWidth = 1300;
  const resized = image.resize(targetWidth);
  // rasterize resized image to a buffer so we know exact dimensions for composite
  const resizedBuffer = await resized.png().toBuffer();
  const resizedMeta = await sharp(resizedBuffer).metadata();
  const resizedHeight = resizedMeta.height || Math.round(targetWidth * 0.7);

  // load font (some jimp options may point to .fnt descriptor or a font file; attempt to fetch whatever provided)
    let fontBuf = null;
    try {
      fontBuf = await fetchBuffer(jimpOptions[fontKey]);
    } catch (err) {
      // Not fatal; continue without embedded font
      fontBuf = null;
    }

    const fontB64 = fontBuf ? fontBuf.toString('base64') : null;

    // Build SVG overlay with embedded font (if available)
  const fontSizePx = parseInt(String(font_size), 10) || 64;
    const fill = (String(color || 'WHITE').toLowerCase() === 'white') ? '#FFFFFF' : '#000000';
  const yOff = parseInt(String(yOffset), 10) || 0;
  const xOff = parseInt(String(xOffset), 10) || 0;
  const align = (jimpOptions && jimpOptions.text_align) ? String(jimpOptions.text_align).toLowerCase() : 'center';
  // Jimp used a print box of height 900 with alignmentY=MIDDLE. So the effective text center is yOffset + 900/2
  const boxHeight = 900;
  // Base text center (matches Jimp print box middle)
  let textY = yOff + Math.round(boxHeight / 2);
  // Nudge text a bit lower so it visually sits better on certificate templates.
  // Scale the nudge with font size so it behaves consistently for different sizes.
  const verticalNudge = Math.round((fontSizePx || 64) * 0.25); // ~16px for 64px font
  textY += verticalNudge;

  // overlay height should match the resized image height for composite
  const overlayHeight = resizedHeight;

  // clamp textY to be inside the image bounds
  if (textY < 0) textY = 0;
  if (textY > overlayHeight) textY = overlayHeight;

    const fontFace = fontB64 ? `@font-face{font-family:UserFont; src: url('data:font/ttf;base64,${fontB64}') format('truetype');}` : '';

    // Apply uppercase if requested
    const renderedName = uppercase ? String(name || '').toUpperCase() : String(name || '');

    // Compute x position: support text_align and xOffset. If align=center, use 50% plus xOff pixels (via translate).
    // For left/right, compute pixel positions relative to the image width.
    let textElement = '';
    if (align === 'center') {
      // Use translate to nudge horizontally by xOff while keeping center anchoring
      textElement = `<text x="50%" y="${textY}" class="name" transform="translate(${xOff},0)">${escapeXml(renderedName)}</text>`;
    } else if (align === 'left') {
      const leftX = Math.max(0, 0 + xOff + 20); // small padding
      textElement = `<text x="${leftX}" y="${textY}" class="name" text-anchor="start">${escapeXml(renderedName)}</text>`;
    } else if (align === 'right') {
      const rightX = Math.max(0, targetWidth - xOff - 20);
      textElement = `<text x="${rightX}" y="${textY}" class="name" text-anchor="end">${escapeXml(renderedName)}</text>`;
    } else {
      // default to center
      textElement = `<text x="50%" y="${textY}" class="name" transform="translate(${xOff},0)">${escapeXml(renderedName)}</text>`;
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>\
<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${overlayHeight}">\
  <style>${fontFace} .name{ font-family: ${fontB64 ? 'UserFont' : 'sans-serif'}; font-size: ${fontSizePx}px; fill: ${fill}; dominant-baseline: middle; }</style>\
  ${textElement}\
</svg>`;

    const svgBuffer = Buffer.from(svg);

    const composed = await sharp(resizedBuffer)
      .composite([{ input: svgBuffer, top: 0, left: 0 }])
      .png()
      .toBuffer();

    const dataUri = `data:image/png;base64,${composed.toString('base64')}`;
    return { buffer: dataUri, error: false, error_message: 'Success' };
  } catch (error) {
    console.error('overlay-sharp error:', error);
    return { buffer: null, error: true, error_message: error && error.message ? error.message : 'Failed' };
  }
};
