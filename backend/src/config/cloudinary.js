const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

function assertCloudinaryConfigured() {
  const missing = [];
  if (!process.env.CLOUDINARY_CLOUD_NAME) missing.push('CLOUDINARY_CLOUD_NAME');
  if (!process.env.CLOUDINARY_API_KEY) missing.push('CLOUDINARY_API_KEY');
  if (!process.env.CLOUDINARY_API_SECRET) missing.push('CLOUDINARY_API_SECRET');

  if (missing.length > 0) {
    const err = new Error(`Cloudinary not configured. Missing: ${missing.join(', ')}`);
    err.status = 500;
    throw err;
  }
}

/**
 * Upload a Buffer to Cloudinary.
 * Auto-transforms: max 1600×2133, quality auto, format auto (WebP for modern browsers).
 */
function uploadBufferToCloudinary(buffer, options = {}) {
  assertCloudinaryConfigured();

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'styleai/products',
        resource_type: 'image',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
          transformation: [
  { width: 2000, height: 2667, crop: 'limit' },   // ← 2000px wide (2× retina)
  { quality: 'auto:best', fetch_format: 'auto' }, // ← best quality
],
        ...options,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
}

async function deleteFromCloudinary(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.warn('Cloudinary delete failed:', publicId, err.message);
  }
}

/**
 * Extract public_id from Cloudinary URL.
 * URL: https://res.cloudinary.com/<cloud>/image/upload/v123/styleai/products/abc.jpg
 * Returns: "styleai/products/abc"
 */
function extractPublicId(secureUrl) {
  if (!secureUrl || typeof secureUrl !== 'string') return null;
  try {
    const parts = secureUrl.split('/upload/');
    if (parts.length < 2) return null;
    const withoutVersion = parts[1].replace(/^v\d+\//, '');
    return withoutVersion.replace(/\.[^/.]+$/, '');
  } catch {
    return null;
  }
}

module.exports = {
  cloudinary,
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
  assertCloudinaryConfigured,
};