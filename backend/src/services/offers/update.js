// services/offers/update.js
// ======================================================
// PATCH /api/offers/:id — edit DRAFT offer only
// ======================================================

const prisma = require('../../config/prisma');
const {
  httpError,
  computeOfferTotals,
  shapeOffer,
} = require('./helpers');

async function updateOffer(user, offerId, payload = {}) {
  const existing = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!existing) throw httpError('Offer not found', 404, 'NOT_FOUND');

  if (existing.status !== 'DRAFT') {
    throw httpError(
      `Only DRAFT offers can be edited (current: ${existing.status})`,
      400,
      'NOT_EDITABLE'
    );
  }

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (!isAdmin && user.organizationId !== existing.brand.organizationId) {
    throw httpError('Forbidden: cannot edit this offer', 403, 'FORBIDDEN');
  }

  const data = {};

  if (payload.title !== undefined) data.title = payload.title ?? null;
  if (payload.brandNote !== undefined) data.brandNote = payload.brandNote ?? null;
  if (payload.expiresAt !== undefined) {
    data.expiresAt = payload.expiresAt ? new Date(payload.expiresAt) : null;
  }

  // Recompute totals if items changed
  if (payload.items !== undefined) {
    const totals = await computeOfferTotals({
      items: payload.items,
      currency: existing.currency,
      influencer: existing.influencer,
    });
    data.items = totals.items;
    data.subtotal = totals.subtotal;
    data.discountPct = totals.discountPct;
    data.discountAmount = totals.discountAmount;
    data.adminFeePct = totals.adminFeePct;
    data.adminFee = totals.adminFee;
    data.total = totals.total;
  }

  const updated = await prisma.customOffer.update({
    where: { id: offerId },
    data,
    include: { brand: true, influencer: true },
  });

  return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
}

module.exports = { updateOffer };