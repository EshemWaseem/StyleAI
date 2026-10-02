// services/recommendations/signals/productSignals.js
// ======================================================
// Product-related recommendation signals
// ======================================================

/**
 * Products without AI content → suggest running AI
 */
function productsMissingAi(products) {
  const missing = products.filter((p) => !p.aiContent);
  if (missing.length === 0) return null;

  return {
    id: 'ai-content-missing',
    title: `${missing.length} product${missing.length === 1 ? '' : 's'} missing AI descriptions`,
    reason: `Run AI analysis on "${missing[0].name}" and others to boost SEO and conversion.`,
    confidence: 85,
    action: 'Open products',
    category: 'product',
    link: '/products',
    meta: { count: missing.length, sampleId: missing[0].id },
  };
}

/**
 * No products at all → suggest adding first product
 */
function noProducts(products) {
  if (products.length > 0) return null;

  return {
    id: 'add-product',
    title: 'Add your first product',
    reason: 'Products are the foundation of campaigns and AI matching.',
    confidence: 95,
    action: 'Add product',
    category: 'product',
    link: '/products',
  };
}

/**
 * Products with no category → harder to match with influencers
 */
function productsWithoutCategory(products) {
  const noCat = products.filter((p) => !p.category);
  if (noCat.length === 0 || products.length === 0) return null;

  return {
    id: 'product-categories-missing',
    title: `${noCat.length} product${noCat.length === 1 ? '' : 's'} without category`,
    reason: 'Categories help AI match your products with the right influencers.',
    confidence: 72,
    action: 'Review products',
    category: 'product',
    link: '/products',
    meta: { count: noCat.length },
  };
}

module.exports = {
  productsMissingAi,
  noProducts,
  productsWithoutCategory,
};