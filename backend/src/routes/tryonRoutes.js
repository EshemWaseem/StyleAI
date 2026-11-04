// backend/src/routes/tryonRoutes.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate } = require('../middleware/auth');
const { startTryOn, getTryOnStatus } = require('../controllers/tryonController');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

router.use(authenticate);

router.post('/', upload.single('personPhoto'), startTryOn);
router.get('/status/:jobId', getTryOnStatus);

module.exports = router;