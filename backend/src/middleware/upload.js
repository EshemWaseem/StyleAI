const multer = require('multer');

// Memory storage — buffers held in RAM, streamed to Cloudinary.
const storage = multer.memoryStorage();

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;   // 5 MB per file
const MAX_FILES = 5;                // up to 5 images

const uploader = multer({
  storage,
  limits: {
    fileSize: MAX_SIZE,
    files: MAX_FILES,
  },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      const err = new Error('Only JPEG, PNG, or WebP images are allowed');
      err.status = 400;
      return cb(err);
    }
    cb(null, true);
  },
}).array('images', MAX_FILES);

/**
 * Wrap multer to normalize its errors to 400s.
 */
function handleUpload(req, res, next) {
  uploader(req, res, (err) => {
    if (!err) return next();

    if (err.code === 'LIMIT_FILE_SIZE') {
      err.status = 400;
      err.message = 'Each image must be under 5 MB.';
    } else if (err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE') {
      err.status = 400;
      err.message = `Maximum ${MAX_FILES} images allowed.`;
    } else if (!err.status) {
      err.status = 400;
    }
    next(err);
  });
}

module.exports = { handleUpload, MAX_FILES, ALLOWED_MIME };