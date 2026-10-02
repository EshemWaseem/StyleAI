// services/recommendations/signals/tips.js
// ======================================================
// Generic fallback tips (used when too few signals fire)
// ======================================================

const FALLBACK_TIPS = [
  {
    id: 'tip-knowledge',
    title: 'Improve AI output with brand guidelines',
    reason: 'Upload your brand voice, tone, and style to your knowledge base — AI will write in your voice.',
    confidence: 80,
    action: 'Open knowledge base',
    category: 'ai',
    link: '/knowledge',
  },
  {
    id: 'tip-matching',
    title: 'Try AI influencer matching',
    reason: 'Match your products with creators whose audience aligns with your customer base.',
    confidence: 78,
    action: 'Start matching',
    category: 'strategy',
    link: '/matching',
  },
  {
    id: 'tip-analytics',
    title: 'Review campaign analytics',
    reason: 'See which creators drive the highest ROI and adjust future campaigns accordingly.',
    confidence: 70,
    action: 'Open analytics',
    category: 'analytics',
    link: '/analytics',
  },
];

/**
 * Return the next unused fallback tip
 */
function nextFallbackTip(usedIds) {
  const used = new Set(usedIds || []);
  return FALLBACK_TIPS.find((t) => !used.has(t.id)) || null;
}

module.exports = { FALLBACK_TIPS, nextFallbackTip };