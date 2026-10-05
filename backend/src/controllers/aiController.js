// controllers/aiController.js
const aiService = require('../services/aiService');
const prisma = require('../config/prisma');
const { generateSku } = require('../utils/sku');
const { cloudinary } = require('../config/cloudinary');
const { getBrandContext, buildQuery } = require('../services/knowledge');
const { trackUsage } = require('../services/ai');

// ------------------------------------------------------
// Best-effort brand context fetch — never throws.
// ------------------------------------------------------
async function fetchContext(user, query) {
  try {
    const ctx = await getBrandContext(user, query, { limit: 4, minSimilarity: 0.5 });
    return ctx.formatted || '';
  } catch (err) {
    console.warn('[aiController] brandContext failed:', err.message);
    return '';
  }
}

// ------------------------------------------------------
// Wrap an AI call with usage tracking.
// meta: { modelName, provider, taskType, inputText? }
// ------------------------------------------------------
async function tracked(req, meta, fn) {
  const t0 = Date.now();
  try {
    const result = await fn();
    trackUsage({
      modelName: meta.modelName,
      provider: meta.provider,
      taskType: meta.taskType,
      inputText: meta.inputText || null,
      outputText: typeof result === 'string' ? result : JSON.stringify(result),
      latencyMs: Date.now() - t0,
      status: 'SUCCESS',
      userId: req.user?.id || null,
      organizationId: req.user?.organizationId || null,
      route: req.originalUrl || req.url,
      requestId: req.id || null,
    }).catch(() => {});
    return result;
  } catch (err) {
    trackUsage({
      modelName: meta.modelName,
      provider: meta.provider,
      taskType: meta.taskType,
      inputText: meta.inputText || null,
      latencyMs: Date.now() - t0,
      status: 'ERROR',
      errorMessage: err.message,
      userId: req.user?.id || null,
      organizationId: req.user?.organizationId || null,
      route: req.originalUrl || req.url,
      requestId: req.id || null,
    }).catch(() => {});
    throw err;
  }
}

// Default model identifiers (must match seedAIModels)
const TEXT_MODEL = { modelName: 'qwen2.5:7b', provider: 'ollama', taskType: 'text' };
const VISION_MODEL = { modelName: 'gemini-flash-latest', provider: 'gemini', taskType: 'vision' };
const IMAGE_MODEL = { modelName: 'black-forest-labs/FLUX.1-Kontext-dev', provider: 'huggingface', taskType: 'image' };

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

    const query = buildQuery({
      category: attrs.category,
      product_type: attrs.product_type,
      color: attrs.color,
      material: attrs.material,
      style: attrs.style,
      pattern: attrs.pattern,
      brand: 'brand voice tone style guidelines',
    });

    const brandContext = await fetchContext(req.user, query);

    const content = await tracked(req, { ...TEXT_MODEL, inputText: JSON.stringify(attrs) }, () =>
      aiService.generateProductContent(
        {
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
        },
        { brandContext }
      )
    );

    res.json({ success: true, data: content, _context: { injected: !!brandContext } });
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

    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const body = req.body || {};

    const query = buildQuery({
      category: product.category,
      product_type: body.product_type,
      color: body.color,
      material: body.material,
      style: body.style,
      brand: 'brand voice tone style guidelines',
    });
    const brandContext = await fetchContext(req.user, query);

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

    const content = await tracked(req, { ...TEXT_MODEL, inputText: JSON.stringify(attrs) }, () =>
      aiService.generateProductContent(attrs, { brandContext })
    );

    await prisma.product.update({
      where: { id: productId },
      data: { aiContent: content },
    });

    res.json({ success: true, productId, data: content, _context: { injected: !!brandContext } });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/ai/product/analyze-and-generate
 */
async function analyzeAndGenerate(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'image file is required', code: 'MISSING_IMAGE' });
    }

    const brand_name = req.body?.brand_name || null;
    const brand_voice = req.body?.brand_voice || 'minimal';

    // 1. Analyze image → attributes (VISION)
    const attributes = await tracked(req, { ...VISION_MODEL, inputText: req.file.originalname }, () =>
      aiService.analyzeProductImage(
        req.file.buffer,
        req.file.originalname || 'image.jpg',
        req.file.mimetype
      )
    );

    // 2. Fetch brand context
    const query = buildQuery({
      category: attributes.category,
      product_type: attributes.product_type,
      color: attributes.color,
      material: attributes.material,
      style: attributes.style,
      brand: 'brand voice tone style guidelines',
    });
    const brandContext = await fetchContext(req.user, query);

    // 3. Generate content from attributes (TEXT)
    const content = await tracked(req, { ...TEXT_MODEL, inputText: JSON.stringify(attributes) }, () =>
      aiService.generateProductContent(
        {
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
        },
        { brandContext }
      )
    );

    // 4. SKU preview
    let sku = null;
    try {
      if (req.user?.organizationId) {
        const brand = await prisma.brand.findFirst({
          where: { organizationId: req.user.organizationId },
          select: { id: true },
        });
        if (brand) {
          sku = await generateSku(prisma, brand.id, {
            category: attributes.category,
            color: attributes.color,
            target_gender: attributes.target_gender,
          });
        }
      }
    } catch (err) {
      console.warn('[aiController] SKU preview failed:', err.message);
    }

    res.json({
      success: true,
      data: { attributes, content, sku },
      _context: { injected: !!brandContext },
    });
  } catch (err) {
    console.error('[aiController] analyzeAndGenerate failed:', err.message);
    next(err);
  }
}

/**
 * POST /api/ai/product/variants — no AI (PIL only)
 */
async function generateProductVariants(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'image file is required', code: 'MISSING_IMAGE' });
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

/**
 * POST /api/ai/product/angles — image gen
 */
async function generateAngles(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'image file is required', code: 'MISSING_IMAGE' });
    }
    const rawKeys = (req.body?.keys || '').toString().trim();
    const keys = rawKeys ? rawKeys.split(',').map((k) => k.trim()).filter(Boolean) : [];

    const { variants, meta } = await tracked(req, { ...IMAGE_MODEL, inputText: req.file.originalname }, () =>
      aiService.generateProductAngles(
        req.file.buffer,
        req.file.originalname || 'image.jpg',
        req.file.mimetype,
        keys
      )
    );

    const uploaded = [];
    for (const v of variants) {
      const dataUri = `data:${v.mime};base64,${v.base64}`;
      const result = await cloudinary.uploader.upload(dataUri, {
        folder: 'styleai/angles',
        resource_type: 'image',
      });
      uploaded.push({
        key: v.key,
        label: v.label,
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      });
    }

    res.json({ success: true, data: { variants: uploaded, meta } });
  } catch (err) {
    console.error('[aiController] generateAngles failed:', err.message);
    next(err);
  }
}

/**
 * POST /api/ai/content/platform
 */
async function generatePlatformContent(req, res, next) {
  try {
    const body = req.body || {};
    if (!body.platform) return res.status(400).json({ message: 'platform is required' });

    const allowed = ['instagram', 'tiktok', 'youtube', 'blog'];
    if (!allowed.includes(body.platform)) {
      return res.status(400).json({ message: `platform must be one of: ${allowed.join(', ')}` });
    }

    let payload = { ...body };
    if (body.productId) {
      const product = await prisma.product.findUnique({
        where: { id: body.productId },
        include: { brand: true },
      });
      if (product) {
        payload.product_name = body.product_name || product.name;
        payload.category = body.category || product.category;
        payload.description = body.description || product.description;
        payload.price = body.price ?? (product.price != null ? Number(product.price) : null);
        payload.currency = body.currency || product.currency || 'USD';
        payload.brand_name = body.brand_name || product.brand?.name || null;
      }
    }
    if (!payload.product_name) {
      return res.status(400).json({ message: 'product_name is required' });
    }

    const query = buildQuery({
      platform: body.platform,
      category: payload.category,
      product_name: payload.product_name,
      brand: 'content tone voice style caption guidelines',
    });
    const brandContext = await fetchContext(req.user, query);

    const result = await tracked(req, { ...TEXT_MODEL, inputText: JSON.stringify(payload) }, () =>
      aiService.generatePlatformContent(payload, { brandContext })
    );
    res.json({ success: true, data: result, _context: { injected: !!brandContext } });
  } catch (err) {
    console.error('[aiController] generatePlatformContent failed:', err.message);
    next(err);
  }
}

/**
 * POST /api/ai/product/photography — image gen
 */
async function generatePhotography(req, res, next) {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'image file is required', code: 'MISSING_IMAGE' });
    }

    const scene = (req.body?.scene || 'studio').toString().trim().toLowerCase();
    const lighting = req.body?.lighting?.toString().trim() || 'soft daylight';

    const query = buildQuery({
      scene,
      lighting,
      brand: 'photography aesthetic visual style brand guidelines',
    });
    const brandContext = await fetchContext(req.user, query);

    const fields = {
      scene,
      lighting,
      include_model: req.body?.include_model === 'true' || req.body?.include_model === true,
      aspect_ratio: req.body?.aspect_ratio?.toString().trim() || '4:5',
      extra_notes: req.body?.extra_notes?.toString() || '',
      brand_context: brandContext,
    };

    const result = await tracked(req, { ...IMAGE_MODEL, inputText: `${scene} / ${lighting}` }, () =>
      aiService.generateProductPhotography(
        req.file.buffer,
        req.file.originalname || 'product.jpg',
        req.file.mimetype,
        fields
      )
    );

    const dataUri = `data:${result.variant.mime};base64,${result.variant.base64}`;
    const uploaded = await cloudinary.uploader.upload(dataUri, {
      folder: 'styleai/photography',
      resource_type: 'image',
    });

    res.json({
      success: true,
      data: {
        scene: result.scene,
        provider: result.provider,
        model: result.model,
        latency_ms: result.latency_ms,
        regenerated: result.regenerated,
        quality: result.quality,
        image: {
          url: uploaded.secure_url,
          publicId: uploaded.public_id,
          width: uploaded.width,
          height: uploaded.height,
        },
      },
      _context: { injected: !!brandContext },
    });
  } catch (err) {
    console.error('[aiController] generatePhotography failed:', err.message);
    next(err);
  }
}

module.exports = {
  generateContent,
  generateContentForProduct,
  analyzeAndGenerate,
  generateProductVariants,
  generateAngles,
  generatePlatformContent,
  generatePhotography,
};