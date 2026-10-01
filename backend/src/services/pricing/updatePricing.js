// services/pricing/updatePricing.js
// ======================================================
// Logic for PUT /api/influencers/:id/pricing
// Single write surface for: pricingTiers + currency + minBudget + acceptsBundles
// ======================================================

const prisma = require('../../config/prisma');
const {
  httpError,
  validatePriceField,
  shapeInfluencer,
} = require('../influencer/helpers');
const { validatePricingTiers } = require('./validatePricing');
const matchingCache = require('../matching/cache');

// function assertCanEditPricing(user, influencer) {
//   const isSelf = influencer.userId === user.id;
//   const isAdmin = user.roles?.includes('SUPER_ADMIN');
//   const hasPermission = user.permissions?.includes('influencer.update');

//   if (!isSelf && !isAdmin && !hasPermission) {
//     throw httpError('Forbidden: cannot edit this influencer pricing', 403, 'FORBIDDEN');
//   }
// }

function assertCanEditPricing(user, influencer) {
  const isSelf = influencer.userId === user.id;

  // STRICT: only the owning user can edit their own pricing.
  if (!isSelf) {
    throw httpError(
      'Forbidden: only the influencer owner can edit pricing',
      403,
      'NOT_OWNER'
    );
  }

  if (!user.permissions?.includes('influencer.update')) {
    throw httpError('Forbidden: missing influencer.update permission', 403, 'FORBIDDEN');
  }
}

async function updateInfluencerPricing(user, influencerId, payload = {}) {
  const existing = await prisma.influencer.findUnique({ where: { id: influencerId } });
  if (!existing) throw httpError('Influencer not found', 404, 'NOT_FOUND');

  assertCanEditPricing(user, existing);

  const data = {};

  // -------- pricingTiers --------
  if (payload.pricingTiers !== undefined) {
    data.pricingTiers = validatePricingTiers(payload.pricingTiers);
  }

  // -------- currency --------
  if (payload.currency !== undefined) {
    if (payload.currency === null) {
      throw httpError('currency cannot be null', 400, 'INVALID_CURRENCY');
    }
    const c = String(payload.currency).trim().toUpperCase();
    if (!c || c.length > 8) {
      throw httpError('currency must be a short code (e.g. USD, PKR, AED)', 400, 'INVALID_CURRENCY');
    }
    data.currency = c;
  }

  // -------- minBudget --------
  if (payload.minBudget !== undefined) {
    if (payload.minBudget === null) {
      data.minBudget = null;
    } else {
      data.minBudget = validatePriceField(payload.minBudget, 'Minimum budget', 0);
    }
  }

  // -------- acceptsBundles --------
  if (payload.acceptsBundles !== undefined) {
    if (payload.acceptsBundles === null) {
      data.acceptsBundles = null;
    } else if (typeof payload.acceptsBundles !== 'boolean') {
      throw httpError('acceptsBundles must be true, false, or null', 400, 'INVALID_ACCEPTS_BUNDLES');
    } else {
      data.acceptsBundles = payload.acceptsBundles;
    }
  }

  if (Object.keys(data).length === 0) {
    throw httpError('No pricing fields provided to update', 400, 'EMPTY_PAYLOAD');
  }

  const updated = await prisma.influencer.update({
    where: { id: influencerId },
    data,
    include: { socialAccounts: true, audienceMetrics: true },
  });

  matchingCache.invalidateInfluencer(influencerId);

  return shapeInfluencer(updated);
}

module.exports = { updateInfluencerPricing };