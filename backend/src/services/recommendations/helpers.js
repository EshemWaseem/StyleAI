// services/recommendations/helpers.js
// ======================================================
// Shared helpers for recommendations
// ======================================================

function safeSignal(fn, ...args) {
  try {
    const result = fn(...args);
    return result || null;
  } catch (err) {
    console.warn('[recommendations] signal failed:', err.message);
    return null;
  }
}

function compactSignals(signals, max = 6) {
  return signals.filter(Boolean).slice(0, max);
}

/**
 * Sort recommendations by:
 * 1. Confidence (descending) — more certain first
 * 2. Category priority — critical > action > optimization > strategy
 */
const CATEGORY_PRIORITY = {
  performance: 0,   // low-roi, top-performer — data-backed
  campaign: 1,      // needs action
  offer: 2,         // needs action
  finance: 3,       // wallet issues
  product: 4,       // data hygiene
  analytics: 5,     // retrospective
  strategy: 6,      // long-term
};

function sortByPriority(recs) {
  return [...recs].sort((a, b) => {
    const pa = CATEGORY_PRIORITY[a.category] ?? 99;
    const pb = CATEGORY_PRIORITY[b.category] ?? 99;
    if (pa !== pb) return pa - pb;
    return (b.confidence || 0) - (a.confidence || 0);
  });
}

function shapeResponse(recs, cached = false) {
  return {
    recommendations: recs,
    generatedAt: new Date().toISOString(),
    cached,
  };
}

module.exports = { safeSignal, compactSignals, shapeResponse, sortByPriority };