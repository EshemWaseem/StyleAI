// backend/src/services/agency/aiCampaign.js
const { httpError } = require('../influencer/helpers');

const AI_SERVICE_URL = (process.env.AI_SERVICE_URL || 'http://localhost:8000').trim();

async function generateAdText(payload) {
  const { productName, category, brandVoice } = payload;
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/product-content/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: productName,
        category: category || 'fashion',
        tone: brandVoice || 'premium',
        platform: 'meta'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate ad text');
    }

    const data = await response.json();
    return {
      adText: data.description || data.caption || `Discover the new ${productName}.`,
      headline: data.headline || 'Shop the Collection',
    };
  } catch (error) {
    throw httpError(error.message || 'AI Service unavailable', 500, 'AI_TEXT_FAILED');
  }
}

async function generateAdImage(payload) {
  const { originalImageUrl, style } = payload;
  
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/product-photography/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: originalImageUrl,
        scene: style || 'studio',
        aspect_ratio: '1:1',
        brand_context: 'premium fashion'
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate ad image');
    }

    const data = await response.json();
    return {
      generatedImageUrl: data.image_url || data.generated_image_url,
    };
  } catch (error) {
    throw httpError(error.message || 'AI Service unavailable', 500, 'AI_IMAGE_FAILED');
  }
}


async function generateCampaignStrategy(payload) {
  const { productName, category, price } = payload;
  try {
    const response = await fetch(`${AI_SERVICE_URL}/api/v1/campaign/strategy`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_name: productName,
        category: category || 'fashion',
        price: price || 0
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || 'Failed to generate strategy');
    }
    return await response.json();
  } catch (error) {
    throw httpError(error.message || 'AI Strategy Service unavailable', 500, 'AI_STRATEGY_FAILED');
  }
}

module.exports = {
  generateAdText,
  generateAdImage,
  generateCampaignStrategy
};