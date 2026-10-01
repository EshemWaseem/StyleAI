// controllers/uploadController.js
const multer = require('multer');
const { uploadBufferToCloudinary } = require('../config/cloudinary');
const { httpError } = require('../services/influencer/helpers');

// Multer: memory storage, 15MB per file, up to 10 files
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 10 },
  fileFilter: (req, file, cb) => {
    const ok = /^image\/(jpeg|png|webp|jpg)$|^video\/(mp4|quicktime|webm)$/.test(file.mimetype);
    if (!ok) return cb(new Error('Only JPG, PNG, WebP, MP4, MOV, WebM allowed'));
    cb(null, true);
  },
});

async function uploadCampaignFiles(req, res, next) {
  try {
    if (!req.files || req.files.length === 0) {
      throw httpError('No files uploaded', 400, 'NO_FILES');
    }

    const folder = `styleai/campaigns/${req.params.campaignId}/${req.params.deliverableId}`;

    const uploaded = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer, {
          folder,
          resourceType: file.mimetype.startsWith('video/') ? 'video' : 'image',
        });
        return {
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type,
          format: result.format,
          bytes: result.bytes,
          originalName: file.originalname,
        };
      })
    );

    res.json({ uploaded });
  } catch (err) {
    next(err);
  }
}

module.exports = { upload, uploadCampaignFiles };