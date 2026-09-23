/**
 * AI service client — talks to the FastAPI AI service.
 * Adds X-Internal-Key automatically. Never exposes the key to clients.
 */

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY =
  process.env.AI_INTERNAL_KEY || 'dev-internal-key-change-me';
const AI_TIMEOUT_MS = Number(process.env.AI_REQUEST_TIMEOUT_MS || 300000);

if (!process.env.AI_INTERNAL_KEY) {
  console.warn('[aiService] AI_INTERNAL_KEY is not set — using dev default');
}

/**
 * Low-level JSON call to FastAPI.
 */
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
      const err = new Error(
        `AI service error ${res.status}: ${text || res.statusText}`
      );
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
 * @returns {Promise<Object>} { product_name, short_description, description, tags, seo_title, seo_description }
 */
async function generateProductContent(attributes) {
  const result = await callAI('/api/v1/product/content', {
    method: 'POST',
    body: attributes,
  });

  if (!result.success) {
    const err = new Error(
      result.error?.message || 'AI content generation failed'
    );
    err.status = 502;
    throw err;
  }

  return result.data;
}

/**
 * Analyze a product image (raw bytes) via FastAPI multipart endpoint.
 * @param {Buffer} fileBuffer
 * @param {string} filename
 * @param {string} mimetype
 * @returns {Promise<Object>} { target_gender, category, product_type, color, ... }
 */
async function analyzeProductImage(fileBuffer, filename, mimetype) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append(
      'image',
      new Blob([fileBuffer], { type: mimetype || 'image/jpeg' }),
      filename || 'image.jpg'
    );

    const res = await fetch(`${AI_SERVICE_URL}/api/v1/product/analyze`, {
      method: 'POST',
      headers: {
        'X-Internal-Key': AI_INTERNAL_KEY,
        // NOTE: no Content-Type — FormData sets it automatically with boundary
      },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const err = new Error(
        `AI analyze error ${res.status}: ${text || res.statusText}`
      );
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


/**
 * Generate 3 image views from one upload.
 * @param {Buffer} buffer
 * @param {string} filename
 * @param {string} mimetype
 * @returns {Promise<Array<{label, base64, mime, width, height}>>}
 */
async function generateVariants(buffer, filename, mimetype) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const form = new FormData();
    form.append(
      'image',
      new Blob([buffer], { type: mimetype || 'image/jpeg' }),
      filename || 'image.jpg'
    );

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

module.exports = {
  callAI,
  generateProductContent,
  analyzeProductImage,
   generateVariants, 
};