const multer = require('multer');

const storage = multer.memoryStorage();

// Per-field size limits. Picture + NDA must add up to less than Vercel's
// 4.5MB serverless request cap (2.5MB + 1.5MB = 4MB), otherwise the platform
// rejects the upload with an opaque 413 before this code even runs.
const MAX_PICTURE_BYTES = 2.5 * 1024 * 1024;
const MAX_NDA_BYTES = 1.5 * 1024 * 1024;

const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

const fileFilter = (req, file, cb) => {
  if (file.fieldname === 'nda') {
    const isPdfMime = file.mimetype === 'application/pdf';
    const isPdfExt = /\.pdf$/i.test(file.originalname);
    if (isPdfMime && isPdfExt) {
      cb(null, true);
    } else {
      const error = new Error('Invalid file type. NDA must be a PDF file.');
      error.status = 400;
      cb(error, false);
    }
    return;
  }

  // Default: picture field accepts only images
  const isMimeAllowed = IMAGE_MIME_TYPES.includes(file.mimetype);
  const isExtAllowed = /\.(jpe?g|png|heic|heif)$/i.test(file.originalname);

  if (isMimeAllowed && isExtAllowed) {
    cb(null, true);
  } else {
    const error = new Error('Invalid file type. Only JPEG, PNG, and HEIC/HEIF images are allowed.');
    error.status = 400;
    cb(error, false);
  }
};

const multerInstance = multer({
  storage,
  limits: {
    // Hard cap = the largest per-field limit. The tighter NDA limit below is
    // enforced per field in validateImageMagicBytes.
    fileSize: MAX_PICTURE_BYTES,
  },
  fileFilter,
});

const onboardingFields = multerInstance.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'nda', maxCount: 1 },
]);

/**
 * Runs the multer upload and converts its errors into clean 400 responses
 * instead of falling through to the generic 500 handler.
 */
const uploadOnboardingFiles = (req, res, next) => {
  onboardingFields(req, res, (err) => {
    if (!err) return next();

    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        const isNda = err.field === 'nda';
        return res.status(400).json({
          success: false,
          error: isNda
            ? 'Signed NDA is too large. Maximum size is 1.5MB.'
            : 'Profile picture is too large. Maximum size is 2.5MB.',
        });
      }

      return res.status(400).json({ success: false, error: err.message });
    }

    return next(err);
  });
};

/**
 * Middleware to enforce per-field file size limits and verify magic-byte
 * signatures on in-memory buffers.
 * Sizes: picture <= 2.5MB, nda <= 1.5MB.
 * Signatures: valid JPEG (0xFF 0xD8 0xFF), PNG (0x89 0x50 0x4E 0x47), or HEIC (ftyp at offset 4).
 */
const validateImageMagicBytes = (req, res, next) => {
  const files = req.files || {};
  const fileList = [];

  // Pictures must be valid images
  for (const file of files.picture || []) {
    fileList.push({ file, fieldType: 'image' });
  }

  // NDA must be a valid PDF
  for (const file of files.nda || []) {
    fileList.push({ file, fieldType: 'pdf' });
  }

  for (const { file, fieldType } of fileList) {
    if (!file.buffer || file.buffer.length < 4) {
      return res.status(400).json({
        success: false,
        error: `Invalid file: ${file.fieldname} contains insufficient data`,
      });
    }

    // Enforce the tighter per-field limits (multer only caps at the largest one)
    const maxBytes = fieldType === 'pdf' ? MAX_NDA_BYTES : MAX_PICTURE_BYTES;
    if (file.size > maxBytes) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
      return res.status(400).json({
        success: false,
        error: fieldType === 'pdf'
          ? `Signed NDA is too large (${sizeMb}MB). Maximum size is 1.5MB.`
          : `Profile picture is too large (${sizeMb}MB). Maximum size is 2.5MB.`,
      });
    }

    const buf = file.buffer;
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isHeic = buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp';
    const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF

    if (fieldType === 'image') {
      if (!isJpeg && !isPng && !isHeic) {
        return res.status(400).json({
          success: false,
          error: `Invalid file signature for ${file.fieldname}. Uploaded file is not a valid image (JPG, PNG, or HEIC).`,
        });
      }
    } else if (fieldType === 'pdf') {
      if (!isPdf) {
        return res.status(400).json({
          success: false,
          error: `Invalid file signature for ${file.fieldname}. NDA must be a valid PDF file.`,
        });
      }
    }
  }

  next();
};

/**
 * Middleware to parse stringified JSON array fields from multipart/form-data
 * (socials and faDetails) into JavaScript arrays before express-validator runs.
 */
const parseOnboardingJsonFields = (req, res, next) => {
  if (req.body) {
    if (typeof req.body.socials === 'string') {
      try {
        req.body.socials = JSON.parse(req.body.socials);
      } catch (err) {
        // Leave as string so express-validator captures invalid format
      }
    }

    if (typeof req.body.faDetails === 'string') {
      try {
        req.body.faDetails = JSON.parse(req.body.faDetails);
      } catch (err) {
        // Leave as string so express-validator captures invalid format
      }
    }
  }
  next();
};

module.exports = {
  uploadOnboardingFiles,
  validateImageMagicBytes,
  parseOnboardingJsonFields,
};
