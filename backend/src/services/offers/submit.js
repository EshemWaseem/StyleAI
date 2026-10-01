// services/offers/submit.js
// ======================================================
// DRAFT → PENDING_ADMIN transition
// Holds escrow from brand wallet before flipping status.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');
const { writeAudit } = require('../admin/helpers');
const { holdEscrowForOffer } = require('../wallet');
const { notifyAdmins } = require('../notifications');
async function submitOffer(user, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  if (offer.status !== 'DRAFT') {
    throw httpError(
      `Only DRAFT offers can be submitted (current: ${offer.status})`,
      400,
      'NOT_SUBMITTABLE'
    );
  }

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (!isAdmin && user.organizationId !== offer.brand.organizationId) {
    throw httpError('Forbidden: cannot submit this offer', 403, 'FORBIDDEN');
  }

  // ⚡ Hold escrow BEFORE status flip.
  // If brand lacks funds, this throws and status stays DRAFT.
  await holdEscrowForOffer(user.id, offerId);

  const updated = await prisma.customOffer.update({
    where: { id: offerId },
    data: { status: 'PENDING_ADMIN' },
    include: { brand: true, influencer: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'offer.submit',
    targetType: 'CustomOffer',
    targetId: offerId,
    meta: {
      previousStatus: 'DRAFT',
      newStatus: 'PENDING_ADMIN',
      escrowHeld: Number(offer.total),
      currency: offer.currency,
    },
  });

  await notifyAdmins({
    type: 'OFFER_SUBMITTED',
    title: 'New offer awaiting review',
    body: `${offer.brand.name} submitted an offer for ${offer.influencer.displayName} — ${offer.currency} ${Number(offer.total).toFixed(2)}`,
    link: '/admin/offers',
    meta: { offerId, brandId: offer.brandId, total: Number(offer.total) },
  });

  return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
}

module.exports = { submitOffer };