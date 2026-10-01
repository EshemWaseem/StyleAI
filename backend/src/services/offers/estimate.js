// services/offers/estimate.js
// ======================================================
// POST /api/offers/estimate — dry-run totals, nothing saved
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, computeOfferTotals } = require('./helpers');

async function estimateOfferTotals(user, payload = {}) {
  const { influencerId, items } = payload;

  if (!influencerId) throw httpError('influencerId is required', 400, 'MISSING_INFLUENCER');

  const influencer = await prisma.influencer.findUnique({
    where: { id: influencerId },
  });
  if (!influencer) throw httpError('Influencer not found', 404, 'INFLUENCER_NOT_FOUND');

  const totals = await computeOfferTotals({
    items,
    currency: influencer.currency,
    influencer,
  });

  return { ...totals, currency: influencer.currency };
}

module.exports = { estimateOfferTotals };