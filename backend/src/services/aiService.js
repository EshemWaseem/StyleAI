// services/aiService.js
/**
 * AI service client — talks to the FastAPI AI service.
 * Adds X-Internal-Key automatically. Never exposes the key to clients.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY || 'dev-internal-key-change-me';
const AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 300000);

if (!process.env.AI_INTERNAL_KEY) {
  console.warn('[aiService] AI_INTERNAL_KEY is not set — using dev default');
}

async function callAI(path, { method = 'POST', body } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const res = await fetch(`${AI_SERVICE_URL}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY,
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`AI service error ${res.status}: ${text || res.statusText}`);
      err.status = res.status === 403 ? 502 : res.status >= 500 ? 502 : res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI service timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate e-commerce content from verified product attributes.
 * @param {Object} attributes
 * @param {Object} [options] { brandContext?: string }
 */
async function generateProductContent(attributes, options = {}) {
  const body = { ...attributes };
  if (options.brandContext) {
    body.brand_context = String(options.brandContext).slice(0, 4000);
  }
  const result = await callAI('/api/v1/product/content', { method: 'POST', body });
  if (!result.success) {
    const err = new Error(result.error?.message || 'AI content generation failed');
    err.status = 502;
    throw err;
  }
  return result.data;
}

async function analyzeProductImage(fileBuffer, filename, mimetype) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('image', new Blob([fileBuffer], { type: mimetype || 'image/jpeg' }), filename || 'image.jpg');
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/product/analyze`, {
      method: 'POST',
      headers: { 'X-Internal-Key': AI_INTERNAL_KEY },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`AI analyze error ${res.status}: ${text || res.statusText}`);
      err.status = res.status === 403 ? 502 : res.status >= 500 ? 502 : res.status;
      throw err;
    }
    const result = await res.json();
    if (!result.success) {
      const err = new Error(result.error?.message || 'Analysis failed');
      err.status = 502;
      throw err;
    }
    return result.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI analyze timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function generateVariants(buffer, filename, mimetype) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype || 'image/jpeg' }), filename || 'image.jpg');
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/product/variants`, {
      method: 'POST',
      headers: { 'X-Internal-Key': AI_INTERNAL_KEY },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`AI variants error ${res.status}: ${text}`);
      err.status = res.status >= 500 ? 502 : res.status;
      throw err;
    }
    const result = await res.json();
    if (!result.success) {
      const err = new Error(result.error?.message || 'Variant generation failed');
      err.status = 502;
      throw err;
    }
    return result.data.variants;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI variants timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function generateProductAngles(buffer, filename, mimetype, keys = []) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype || 'image/jpeg' }), filename || 'image.jpg');
    if (Array.isArray(keys) && keys.length > 0) form.append('keys', keys.join(','));
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/product/angles`, {
      method: 'POST',
      headers: { 'X-Internal-Key': AI_INTERNAL_KEY },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`AI angles error ${res.status}: ${text}`);
      err.status = res.status >= 500 ? 502 : res.status;
      throw err;
    }
    const result = await res.json();
    if (!result.success) {
      const err = new Error(result.error?.message || 'Angle generation failed');
      err.status = 502;
      throw err;
    }
    return result.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI angles timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Generate per-platform content.
 * @param {Object} payload
 * @param {Object} [options] { brandContext?: string }
 */
async function generatePlatformContent(payload, options = {}) {
  const body = { ...payload };
  if (options.brandContext) {
    body.brand_context = String(options.brandContext).slice(0, 4000);
  }
  const result = await callAI('/api/v1/content/platform', { method: 'POST', body });
  return result;
}

/**
 * Generate product photography with optional brand context.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimetype
 * @param {Object} fields  { scene, lighting, include_model, aspect_ratio, extra_notes, brand_context }
 */
async function generateProductPhotography(buffer, filename, mimetype, fields = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
  try {
    const form = new FormData();
    form.append('image', new Blob([buffer], { type: mimetype || 'image/jpeg' }), filename || 'product.jpg');
    form.append('scene', fields.scene || 'studio');
    form.append('lighting', fields.lighting || 'soft daylight');
    form.append('include_model', fields.include_model ? 'true' : 'false');
    form.append('aspect_ratio', fields.aspect_ratio || '4:5');
    if (fields.extra_notes) form.append('extra_notes', String(fields.extra_notes).slice(0, 300));
    if (fields.brand_context) form.append('brand_context', String(fields.brand_context).slice(0, 2000));

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/product/photography`, {
      method: 'POST',
      headers: { 'X-Internal-Key': AI_INTERNAL_KEY },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(`AI photography error ${res.status}: ${text}`);
      err.status = res.status >= 500 ? 502 : res.status;
      throw err;
    }
    const result = await res.json();
    if (!result.success) {
      const err = new Error(result.error?.message || 'Photography generation failed');
      err.status = 502;
      throw err;
    }
    return result.data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const e = new Error('AI photography timeout');
      e.status = 504;
      throw e;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  callAI,
  generateProductContent,
  analyzeProductImage,
  generateVariants,
  generateProductAngles,
  generatePlatformContent,
  generateProductPhotography,
};