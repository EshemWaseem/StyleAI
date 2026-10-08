// services/recommendations/signals/productSignals.js
// ======================================================
// Product-related recommendation signals — DYNAMIC confidence
// ======================================================

const { computeConfidence } = require('../confidence');

function productsMissingAi(products) {
  const missing = products.filter((p) => !p.aiContent);
  if (missing.length === 0) return null;

  const sampleNames = missing.slice(0, 2).map((p) => `"${p.name}"`).join(', ');
  const moreCount = missing.length - 2;

  return {
    id: 'ai-content-missing',
    title: `${missing.length} product${missing.length === 1 ? '' : 's'} missing AI descriptions`,
    reason: `Run AI analysis on ${sampleNames}${moreCount > 0 ? ` and ${moreCount} more` : ''} to boost SEO and conversion.`,
    confidence: computeConfidence({
      count: missing.length,
      sampleSize: products.length,
      urgency: missing.length > 5 ? 'high' : 'normal',
    }),
    action: 'Open products',
    category: 'product',
    link: '/products',
    meta: { count: missing.length, productIds: missing.slice(0, 5).map((p) => p.id) },
  };
}

function noProducts(products) {
  if (products.length > 0) return null;

  return {
    id: 'add-product',
    title: 'Add your first product',
    reason: 'Products are the foundation of campaigns and AI matching. Upload 3-5 to unlock smart recommendations.',
    confidence: 95,
    action: 'Add product',
    category: 'product',
    link: '/products',
  };
}

function productsWithoutCategory(products) {
  const noCat = products.filter((p) => !p.category);
  if (noCat.length === 0 || products.length === 0) return null;

  const ratio = noCat.length / products.length;

  return {
    id: 'product-categories-missing',
    title: `${noCat.length} product${noCat.length === 1 ? '' : 's'} without category`,
    reason: `${Math.round(ratio * 100)}% of your catalog has no category. Categories help AI match your products with the right influencers.`,
    confidence: computeConfidence({
      count: noCat.length,
      sampleSize: products.length,
      urgency: ratio > 0.5 ? 'high' : 'normal',
    }),
    action: 'Review products',
    category: 'product',
    link: '/products',
    meta: { count: noCat.length, ratio: Math.round(ratio * 100) },
  };
}

module.exports = {
  productsMissingAi,
  noProducts,
  productsWithoutCategory,
};