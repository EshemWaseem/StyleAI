// services/pricing/validatePricing.js
// ======================================================
// Structural validation for Influencer.pricingTiers
// ======================================================
// Rules:
//   • Object keyed by Prisma InfluencerPlatform values
//   • Each platform value = { contentType: price }
//   • contentType must be supported on that platform (platformCatalog)
//   • price is a non-negative number (0 allowed — influencer's choice)
//   • null/undefined/'' for a contentType → REMOVES that tier
//   • Empty platform objects are dropped from the result
// ======================================================

const {
  getPlatform,
  isValidContentType,
} = require('../../config/platformCatalog');
const {
  httpError,
  validatePriceField,
} = require('../influencer/helpers');

/**
 * @param {unknown} input
 * @returns {object|null|undefined}
 *   - undefined → skip update (field not sent)
 *   - null      → explicit clear all tiers
 *   - object    → validated, cleaned map
 */
function validatePricingTiers(input) {
  if (input === undefined) return undefined;
  if (input === null) return null;

  if (typeof input !== 'object' || Array.isArray(input)) {
    throw httpError(
      'pricingTiers must be an object keyed by platform (e.g. { "INSTAGRAM": { "post": 150 } })',
      400,
      'INVALID_PRICING_TIERS'
    );
  }

  const cleaned = {};

  for (const [rawPlatform, tiers] of Object.entries(input)) {
    const platform = String(rawPlatform).toUpperCase();
    const cfg = getPlatform(platform);

    if (!cfg) {
      throw httpError(
        `Unknown platform "${rawPlatform}". See GET /api/catalog/platforms for allowed values.`,
        400,
        'UNKNOWN_PLATFORM'
      );
    }

    if (tiers === null || tiers === undefined) continue;

    if (typeof tiers !== 'object' || Array.isArray(tiers)) {
      throw httpError(
        `Pricing for ${cfg.label} must be an object of { contentType: price }`,
        400,
        'INVALID_PLATFORM_PRICING'
      );
    }

    const cleanedTiers = {};

    for (const [rawContentType, rawPrice] of Object.entries(tiers)) {
      const contentType = String(rawContentType).toLowerCase();

      if (!isValidContentType(platform, contentType)) {
        throw httpError(
          `Content type "${rawContentType}" is not supported on ${cfg.label}. Allowed: ${cfg.contentTypes.join(', ')}`,
          400,
          'INVALID_CONTENT_TYPE'
        );
      }

      // Explicit removal signal
      if (rawPrice === null || rawPrice === undefined || rawPrice === '') continue;

      const price = validatePriceField(
        rawPrice,
        `${cfg.label} ${contentType} price`,
        0
      );

      if (price !== null) cleanedTiers[contentType] = price;
    }

    if (Object.keys(cleanedTiers).length > 0) {
      cleaned[platform] = cleanedTiers;
    }
  }

  return cleaned;
}

module.exports = { validatePricingTiers };