// services/recommendations/helpers.js
// ======================================================
// Shared helpers for recommendations
// ======================================================

/**
 * Safe-call a signal function — returns null on error, never throws
 */
function safeSignal(fn, ...args) {
  try {
    const result = fn(...args);
    return result || null;
  } catch (err) {
    console.warn('[recommendations] signal failed:', err.message);
    return null;
  }
}

/**
 * Filter out null signals, cap at max
 */
function compactSignals(signals, max = 6) {
  return signals.filter(Boolean).slice(0, max);
}

/**
 * Standard response shape
 */
function shapeResponse(recs, cached = false) {
  return {
    recommendations: recs,
    generatedAt: new Date().toISOString(),
    cached,
  };
}

module.exports = { safeSignal, compactSignals, shapeResponse };