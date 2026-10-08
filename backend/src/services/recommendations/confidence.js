// services/recommendations/confidence.js
// ======================================================
// Dynamic confidence calculator — no more magic numbers.
// Confidence is derived from data density + urgency.
// ======================================================

/**
 * Compute confidence based on:
 * - How much data supports the signal
 * - How recent it is
 * - How urgent it is
 *
 * Returns 0-100.
 */
function computeConfidence({ count = 0, sampleSize = 1, ageDays = 0, urgency = 'normal' }) {
  // Base confidence from count (more items = more certainty the signal is real)
  let base = 60 + Math.min(count * 8, 30); // 60-90 range

  // Sample size boosts (if it's a ratio, more samples = higher confidence)
  if (sampleSize > 0) {
    base += Math.min(Math.log10(sampleSize + 1) * 5, 8);
  }

  // Urgency modifier
  const urgencyMod = { low: -5, normal: 0, high: 8, critical: 15 }[urgency] || 0;
  base += urgencyMod;

  // Recency penalty (older signals = less certain they still apply)
  if (ageDays > 0) {
    base -= Math.min(ageDays * 0.5, 15);
  }

  return Math.max(40, Math.min(98, Math.round(base)));
}

module.exports = { computeConfidence };