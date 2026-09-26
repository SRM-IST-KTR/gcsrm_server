const multer = require('multer');

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/heic',
  'image/heif',
];

const fileFilter = (req, file, cb) => {
  const isMimeAllowed = ALLOWED_MIME_TYPES.includes(file.mimetype);
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
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

const uploadOnboardingFiles = multerInstance.fields([
  { name: 'picture', maxCount: 1 },
  { name: 'nda', maxCount: 1 },
]);

/**
 * Middleware to verify magic-byte signatures on in-memory buffers.
 * Enforces valid JPEG (0xFF 0xD8 0xFF), PNG (0x89 0x50 0x4E 0x47), or HEIC (ftyp at offset 4).
 */
const validateImageMagicBytes = (req, res, next) => {
  const files = req.files || {};
  const fileList = [
    ...(files.picture || []),
    ...(files.nda || []),
  ];

  for (const file of fileList) {
    if (!file.buffer || file.buffer.length < 4) {
      return res.status(400).json({
        success: false,
        error: `Invalid file: ${file.fieldname} contains insufficient data`,
      });
    }

    const buf = file.buffer;
    const isJpeg = buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
    const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
    const isHeic = buf.length >= 12 && buf.toString('ascii', 4, 8) === 'ftyp';

    if (!isJpeg && !isPng && !isHeic) {
      return res.status(400).json({
        success: false,
        error: `Invalid file signature for ${file.fieldname}. Uploaded file is not a valid image.`,
      });
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
