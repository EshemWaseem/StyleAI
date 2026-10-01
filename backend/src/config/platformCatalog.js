// backend/src/config/platformCatalog.js
// ======================================================
// PLATFORM VOCABULARY (facts about platforms) — NOT defaults.
// ======================================================
// This file answers ONE question: "what content types does
// each platform support?" — used to VALIDATE user input.
//
// It does NOT set prices, fees, currency, or budgets.
// Those come from:
//   • Influencer.pricingTiers        → per-content-type prices
//   • Influencer.currency            → currency
//   • Influencer.minBudget           → floor
//   • PlatformSetting (DB)           → commission %, discount rules
//
// Platform keys MUST match Prisma enum InfluencerPlatform.
// ======================================================

/**
 * Content types each platform natively supports.
 * Used ONLY for input validation — never for auto-filling.
 */
const PLATFORM_CATALOG = Object.freeze({
  INSTAGRAM: { label: 'Instagram', contentTypes: ['post', 'reel', 'story', 'carousel'] },
  TIKTOK:    { label: 'TikTok',    contentTypes: ['video', 'story'] },
  YOUTUBE:   { label: 'YouTube',   contentTypes: ['video', 'short'] },
  FACEBOOK:  { label: 'Facebook',  contentTypes: ['post', 'video', 'story'] },
  PINTEREST: { label: 'Pinterest', contentTypes: ['pin', 'idea-pin'] },
  LINKEDIN:  { label: 'LinkedIn',  contentTypes: ['post', 'article', 'video'] },
  SNAPCHAT:  { label: 'Snapchat',  contentTypes: ['story', 'spotlight'] },
  TWITTER:   { label: 'X (Twitter)', contentTypes: ['post', 'thread'] },
  THREADS:   { label: 'Threads',   contentTypes: ['post', 'thread'] },
  OTHER:     { label: 'Other',     contentTypes: ['post', 'video', 'story'] },
});

// ------------------------------------------------------
// Pure helpers — no side-effects, no defaults returned
// ------------------------------------------------------

/** @returns {object|null} */
function getPlatform(platformKey) {
  if (!platformKey) return null;
  return PLATFORM_CATALOG[platformKey] || null;
}

/** @returns {boolean} */
function isValidContentType(platformKey, contentType) {
  const cfg = getPlatform(platformKey);
  return !!cfg && cfg.contentTypes.includes(contentType);
}

/** @returns {string[]} valid platform keys (for validation loops) */
function getPlatformKeys() {
  return Object.keys(PLATFORM_CATALOG);
}

/** @returns {string[]} valid content types for a platform (or []) */
function getContentTypes(platformKey) {
  return getPlatform(platformKey)?.contentTypes || [];
}

/**
 * Full catalog as a serializable array — for the frontend to render
 * the pricing grid WITHOUT hardcoding platform knowledge in React.
 * @returns {Array<{ key: string, label: string, contentTypes: string[] }>}
 */
function getCatalogForClient() {
  return Object.entries(PLATFORM_CATALOG).map(([key, cfg]) => ({
    key,
    label: cfg.label,
    contentTypes: cfg.contentTypes,
  }));
}

module.exports = {
  PLATFORM_CATALOG,
  getPlatform,
  isValidContentType,
  getPlatformKeys,
  getContentTypes,
  getCatalogForClient,
};