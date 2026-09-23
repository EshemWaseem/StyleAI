








const aiService = require('../services/aiService');
const prisma = require('../config/prisma');
const { generateSku } = require('../utils/sku');
const cloudinary = require('../config/cloudinary');

/**
 * POST /api/ai/product/content
 */
async function generateContent(req, res, next) {
  try {
    const attrs = req.body || {};

    if (!attrs.category && !attrs.product_type) {
      return res.status(400).json({
        message: 'Provide at least category or product_type',
        code: 'MISSING_ATTRIBUTES',
      });
    }

    const content = await aiService.generateProductContent({
      category: attrs.category || null,
      product_type: attrs.product_type || null,
      color: attrs.color || null,
      material: attrs.material || null,
      target_gender: attrs.target_gender || null,
      pattern: attrs.pattern || null,
      style: attrs.style || null,
      attributes: attrs.attributes || {},
      brand_name: attrs.brand_name || null,
      brand_voice: attrs.brand_voice || 'minimal',
    });

    res.json({ success: true, data: content });
  } catch (err) {
    console.error('[aiController] generateContent failed:', err.message);
    next(err);
  }
}

/**
 * POST /api/ai/product/:productId/content
 */
async function generateContentForProduct(req, res, next) {
  try {
    const { productId } = req.params;

    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const body = req.body || {};

    const attrs = {
      category: product.category || null,
      product_type: body.product_type || null,
      color: body.color || null,
      material: body.material || null,
      target_gender: product.gender || null,
      pattern: body.pattern || null,
      style: body.style || null,
      attributes: body.attributes || {},
      brand_name: body.brand_name || null,
      brand_voice: body.brand_voice || 'minimal',
    };

    const content = await aiService.generateProductContent(attrs);

    await prisma.product.update({
      where: { id: productId },
      data: { aiContent: content },
    });

    res.json({
      success: true,
      productId,
      data: content,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/product/analyze-and-generate
 * Multipart upload. Analyzes image, generates content, previews SKU.
 * Returns { attributes, content, sku }.
 */
async function analyzeAndGenerate(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'image file is required',
        code: 'MISSING_IMAGE',
      });
    }

    const brand_name = req.body?.brand_name || null;
    const brand_voice = req.body?.brand_voice || 'minimal';

    // 1. Analyze image → attributes
    const attributes = await aiService.analyzeProductImage(
      req.file.buffer,
      req.file.originalname || 'image.jpg',
      req.file.mimetype
    );

    // 2. Generate content from attributes
    const content = await aiService.generateProductContent({
      category: attributes.category,
      product_type: attributes.product_type,
      color: attributes.color,
      material: attributes.material,
      target_gender: attributes.target_gender,
      pattern: attributes.pattern,
      style: attributes.style,
      attributes: attributes.attributes || {},
      brand_name,
      brand_voice,
    });

    // 3. SKU preview (not saved — just computed)
    let sku = null;
    try {
      if (req.user?.organizationId) {
        const brand = await prisma.brand.findFirst({
          where: { organizationId: req.user.organizationId },
          select: { id: true },
        });
        if (brand) {
          console.log('first iiiii')
          sku = await generateSku(prisma, brand.id, {
            category: attributes.category,
            color: attributes.color,
            target_gender: attributes.target_gender,
          });
          console.log(`[aiController] SKU preview: ${sku}`);
        } else {
          console.warn('[aiController] No brand found for user org');
        }
      } else {
        console.warn('[aiController] No organizationId on user — skipping SKU');
      }
    } catch (err) {
      console.warn('[aiController] SKU preview failed:', err.message);
      // Non-fatal — continue without SKU
    }

    res.json({
      success: true,
      data: { attributes, content, sku },
    });
  } catch (err) {
    console.error('[aiController] analyzeAndGenerate failed:', {
      message: err.message,
      status: err.status,
      cause: err.cause,
    });
    next(err);
  }
}

/**
 * POST /api/ai/product/variants
 * Multipart image → 3 variants → upload each to Cloudinary → return URLs.
 */
async function generateProductVariants(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: 'image file is required',
        code: 'MISSING_IMAGE',
      });
    }

    const variants = await aiService.generateVariants(
      req.file.buffer,
      req.file.originalname || 'image.jpg',
      req.file.mimetype
    );

    const uploaded = [];
    for (const v of variants) {
      const dataUri = `data:${v.mime};base64,${v.base64}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'styleai/variants',
        resource_type: 'image',
      });
      uploaded.push({
        label: v.label,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    }

    res.json({ success: true, data: { variants: uploaded } });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateContent,
  generateContentForProduct,
  analyzeAndGenerate,
  generateProductVariants,
};







