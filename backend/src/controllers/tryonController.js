// backend/src/controllers/tryonController.js
const prisma = require('../config/prisma');
const axios = require('axios');
// 🆕 Using your exact cloudinary helper function
const { uploadBufferToCloudinary } = require('../config/cloudinary');

const AI_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

async function startTryOn(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ message: 'Person photo is required' });

    const { productId } = req.body;
    if (!productId) return res.status(400).json({ message: 'productId is required' });

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: { images: true }
    });

    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Extract main image
    const garmentImageUrl = product.images?.[0]?.url || null;
    if (!garmentImageUrl) return res.status(400).json({ message: 'Product has no image' });

    const job = await prisma.tryOnJob.create({
      data: { userId: req.user.id, productId: product.id, status: 'PROCESSING' },
    });

    const personImageBase64 = req.file.buffer.toString('base64');

    // Run async in background
    _processAsync(job.id, personImageBase64, garmentImageUrl, product.name).catch((err) => {
      console.error("Background TryOn process error:", err);
    });

    return res.status(202).json({
      jobId: job.id,
      status: 'PROCESSING',
      message: 'Virtual try-on started.',
      estimatedSeconds: 90,
    });
  } catch (err) {
    next(err);
  }
}

async function _processAsync(jobId, personImageBase64, garmentImageUrl, garmentDescription) {
  try {
    const aiRes = await axios.post(
      `${AI_URL}/tryon/generate`,
      {
        person_image_base64: personImageBase64,
        garment_image_url: garmentImageUrl,
        garment_description: garmentDescription,
        steps: 30,
        seed: 42,
      },
      { timeout: AI_TIMEOUT_MS }
    );

    const { success, result_image_base64, error } = aiRes.data;

    if (!success || !result_image_base64) {
      throw new Error(error || 'AI failed to generate image');
    }

    // 🆕 Convert base64 back to Buffer for Cloudinary uploader
    const imageBuffer = Buffer.from(result_image_base64, 'base64');
    
    // 🆕 Using your helper function
    const upload = await uploadBufferToCloudinary(imageBuffer, { folder: 'styleai/tryon' });

    await prisma.tryOnJob.update({
      where: { id: jobId },
      data: { status: 'COMPLETED', resultImageUrl: upload.secure_url, completedAt: new Date() },
    });
  } catch (err) {
    console.error("TryOn Job Failed:", err.message);
    await prisma.tryOnJob.update({
      where: { id: jobId },
      data: { status: 'FAILED', error: err.message?.slice(0, 500) || 'Unknown error occurred' },
    });
  }
}

async function getTryOnStatus(req, res, next) {
  try {
    const { jobId } = req.params;
    const job = await prisma.tryOnJob.findUnique({ where: { id: jobId } });

    if (!job) return res.status(404).json({ message: 'Job not found' });
    if (job.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    return res.json({
      jobId: job.id,
      status: job.status,
      resultImageUrl: job.resultImageUrl || null,
      error: job.error || null,
      createdAt: job.createdAt,
      completedAt: job.completedAt || null,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { startTryOn, getTryOnStatus };