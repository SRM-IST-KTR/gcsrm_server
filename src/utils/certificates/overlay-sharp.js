const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const https = require('https');
// try optional opentype dependency for converting text to outlines (vector paths)
let opentype = null;
try {
  opentype = require('opentype.js');
} catch (e) {
  // not installed — we'll fall back to embedding fonts or text elements
  console.log("'opentype.js' not found, proceeding without font outline support.");
  opentype = null;
}

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

    // load font (some jimp options may point to a font file or to a CSS stylesheet like Google Fonts)
    let fontBuf = null;
    let detectedFontUrl = null; // if we fetch a secondary URL from CSS
    try {
      const raw = await fetchBuffer(jimpOptions[fontKey]);
      if (raw) {
        // Heuristic: if the fetched payload looks like text/CSS and contains url(...) then
        // treat it as a stylesheet (Google Fonts) and extract the first referenced font file URL.
        const asText = raw.toString('utf8');
        if (/@font-face|url\(/i.test(asText)) {
          const m = asText.match(/url\(([^)]+)\)/i);
          if (m && m[1]) {
            let fontFileUrl = m[1].trim().replace(/['"]/g, '');
            // handle protocol-relative URLs
            if (fontFileUrl.startsWith('//')) fontFileUrl = 'https:' + fontFileUrl;
            // remember for mime detection
            detectedFontUrl = fontFileUrl;
            try {
              fontBuf = await fetchBuffer(fontFileUrl);
            } catch (e) {
              // failed to fetch referenced font file; fall back to using raw (CSS) as null
              fontBuf = null;
            }
          } else {
            // stylesheet fetched but no url found
            fontBuf = null;
          }
        } else {
          // raw binary font data
          fontBuf = raw;
        }
      }
    } catch (err) {
      // Not fatal; continue without embedded font
      fontBuf = null;
    }

    // If the fetched resource looked like a stylesheet, try to extract all url(...) entries
    // and prefer a TTF/OTF if present. Otherwise fall back to the first url found.
    if (!fontBuf && jimpOptions[fontKey]) {
      try {
        const raw2 = await fetchBuffer(jimpOptions[fontKey]);
        if (raw2) {
          const asText2 = raw2.toString('utf8');
          if (/@font-face|url\(/i.test(asText2)) {
            const urls = [];
            let m;
            const re = /url\(([^)]+)\)/ig;
            while ((m = re.exec(asText2)) !== null) {
              let u = m[1].trim().replace(/['"]/g, '');
              if (u.startsWith('//')) u = 'https:' + u;
              urls.push(u);
            }
            if (urls.length) {
              // prefer ttf/otf, then woff, then woff2, otherwise first
              const pick = urls.find(u => /\.ttf(\?|$)/i.test(u)) || urls.find(u => /\.otf(\?|$)/i.test(u)) || urls.find(u => /\.woff(\?|$)/i.test(u)) || urls.find(u => /\.woff2(\?|$)/i.test(u)) || urls[0];
              if (pick) {
                detectedFontUrl = pick;
                try {
                  fontBuf = await fetchBuffer(pick);
                } catch (e) {
                  fontBuf = null;
                }
              }
            }
          }
        }
      } catch (e) {
        // ignore
      }
    }

    const fontB64 = fontBuf ? fontBuf.toString('base64') : null;

    // Determine mime-type and format string for @font-face. Prefer the detectedFontUrl extension,
    // otherwise try to infer nothing and default to ttf/truetype.
    function mimeAndFormatFromUrl(url) {
      if (!url) return { mime: 'font/ttf', format: 'truetype' };
      const lower = url.split('?')[0].toLowerCase();
      if (lower.endsWith('.woff2')) return { mime: 'font/woff2', format: 'woff2' };
      if (lower.endsWith('.woff')) return { mime: 'font/woff', format: 'woff' };
      if (lower.endsWith('.otf')) return { mime: 'font/otf', format: 'opentype' };
      if (lower.endsWith('.ttf')) return { mime: 'font/ttf', format: 'truetype' };
      // default
      return { mime: 'font/ttf', format: 'truetype' };
    }

    const detectedUrlForMime = detectedFontUrl || (jimpOptions[fontKey] || '');
    const { mime: fontMime, format: fontFormat } = mimeAndFormatFromUrl(detectedUrlForMime);

    // DEBUG: report font discovery details so user can verify what was embedded
    try {
      const srcLabel = (detectedFontUrl && detectedFontUrl === (path.resolve(__dirname, '../../../PlaywriteVariableFont.ttf'))) ? 'local-override' : (detectedFontUrl ? 'fetched' : 'none');
      const fontBufLen = fontBuf ? fontBuf.length : 0;
      console.log(`[CERT-FONT] source=${srcLabel} detectedUrl=${detectedUrlForMime} mime=${fontMime} format=${fontFormat} size=${fontBufLen}`);
    } catch (e) {
      // ignore logging errors
    }

    // Strict mode: require opentype.js and a fetched font buffer to produce outlines.
    if (!opentype) {
      return { buffer: null, error: true, error_message: 'opentype.js is required for strict outline rendering' };
    }
    if (!fontBuf) {
      return { buffer: null, error: true, error_message: 'Font file could not be fetched for outline rendering' };
    }

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

  const fontFace = fontB64 ? `@font-face{font-family:UserFont; src: url('data:${fontMime};base64,${fontB64}') format('${fontFormat}');}` : '';

    // Apply uppercase if requested
    const renderedName = uppercase ? String(name || '').toUpperCase() : String(name || '');

    // Convert the text to SVG path outlines using opentype (strict)
    let svg = null;
    try {
      const font = opentype.parse(fontBuf.buffer ? fontBuf.buffer : fontBuf);
      // Create a path at origin (0,0) using the font size
      const path = font.getPath(renderedName, 0, fontSizePx, fontSizePx);

        // compute bounding box from path commands
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const cmd of path.commands) {
          if (typeof cmd.x === 'number') {
            minX = Math.min(minX, cmd.x);
            maxX = Math.max(maxX, cmd.x);
          }
          if (typeof cmd.y === 'number') {
            minY = Math.min(minY, cmd.y);
            maxY = Math.max(maxY, cmd.y);
          }
          if (typeof cmd.x1 === 'number') {
            minX = Math.min(minX, cmd.x1);
            maxX = Math.max(maxX, cmd.x1);
          }
          if (typeof cmd.y1 === 'number') {
            minY = Math.min(minY, cmd.y1);
            maxY = Math.max(maxY, cmd.y1);
          }
          if (typeof cmd.x2 === 'number') {
            minX = Math.min(minX, cmd.x2);
            maxX = Math.max(maxX, cmd.x2);
          }
          if (typeof cmd.y2 === 'number') {
            minY = Math.min(minY, cmd.y2);
            maxY = Math.max(maxY, cmd.y2);
          }
        }
        if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
        const bboxWidth = maxX - minX;
        const bboxHeight = maxY - minY;

        // compute target x position based on alignment and xOff
        let tx = 0;
        if (align === 'center') {
          tx = Math.round((targetWidth - bboxWidth) / 2 - minX + xOff);
        } else if (align === 'left') {
          tx = Math.round(0 + xOff + 20 - minX);
        } else if (align === 'right') {
          tx = Math.round(targetWidth - xOff - 20 - bboxWidth - minX);
        } else {
          tx = Math.round((targetWidth - bboxWidth) / 2 - minX + xOff);
        }

        // vertical center the path at textY
        const ty = Math.round(textY - (minY + bboxHeight / 2));

        // convert path to SVG path data
        const pathData = path.toPathData ? path.toPathData() : (() => {
          // fallback: build path d manually
          const parts = [];
          for (const c of path.commands) {
            if (c.type === 'M') parts.push(`M ${c.x} ${c.y}`);
            else if (c.type === 'L') parts.push(`L ${c.x} ${c.y}`);
            else if (c.type === 'C') parts.push(`C ${c.x1} ${c.y1} ${c.x2} ${c.y2} ${c.x} ${c.y}`);
            else if (c.type === 'Q') parts.push(`Q ${c.x1} ${c.y1} ${c.x} ${c.y}`);
            else if (c.type === 'Z') parts.push('Z');
          }
          return parts.join(' ');
        })();

        svg = `<?xml version="1.0" encoding="UTF-8"?>\
<svg xmlns="http://www.w3.org/2000/svg" width="${targetWidth}" height="${overlayHeight}">\
  <g fill="${fill}">\
    <path d="${pathData}" transform="translate(${tx},${ty})" />\
  </g>\
</svg>`;
        try { console.log(`[CERT-FONT] outlines=used bbox=${Math.round(bboxWidth)}x${Math.round(bboxHeight)} tx=${tx} ty=${ty}`); } catch(e) {}
    } catch (outlineErr) {
      return { buffer: null, error: true, error_message: `opentype outline generation failed: ${outlineErr && outlineErr.message ? outlineErr.message : String(outlineErr)}` };
    }

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
