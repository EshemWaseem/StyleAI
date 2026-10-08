// services/offers/adminReview.js
// PENDING_ADMIN → ADMIN_APPROVED | ADMIN_REJECTED
// SUPER_ADMIN only.
// Reject → refund brand's escrow.

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');
const { writeAudit } = require('../admin/helpers');
const { refundEscrowForOffer } = require('../wallet');
const { notifyUser, notifyAdmins } = require('../notifications');

async function adminReviewOffer(user, offerId, payload = {}) {
  const { decision, adminNote } = payload;

  if (!['approve', 'reject'].includes(decision)) {
    throw httpError('decision must be "approve" or "reject"', 400, 'INVALID_DECISION');
  }

  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  if (offer.status !== 'PENDING_ADMIN') {
    throw httpError(
      `Only PENDING_ADMIN offers can be reviewed (current: ${offer.status})`,
      400,
      'NOT_REVIEWABLE'
    );
  }

  const newStatus = decision === 'approve' ? 'ADMIN_APPROVED' : 'ADMIN_REJECTED';

  // On reject → refund escrow back to brand wallet immediately
  // On approve → escrow stays held until influencer accepts/declines
  if (decision === 'reject') {
    await refundEscrowForOffer(user.id, offerId);
  }

  const updated = await prisma.customOffer.update({
    where: { id: offerId },
    data: {
      status: newStatus,
      adminNote: adminNote ?? null,
      reviewedBy: user.id,
      reviewedAt: new Date(),
    },
    include: { brand: true, influencer: true },
  });

  await writeAudit({
    actorId: user.id,
    action: `offer.admin.${decision}`,
    targetType: 'CustomOffer',
    targetId: offerId,
    meta: {
      previousStatus: 'PENDING_ADMIN',
      newStatus,
      adminNote: adminNote ?? null,
      refunded: decision === 'reject' ? Number(offer.total) : 0,
      currency: offer.currency,
    },
  });

  if (decision === 'approve') {
    // Notify brand creator
    await notifyUser(offer.createdBy, {
      type: 'OFFER_APPROVED',
      title: 'Your offer was approved',
      body: `Offer "${offer.title || offer.id.slice(0, 8)}" is now with ${offer.influencer.displayName}.`,
      link: `/offers/${offerId}`,
      meta: { offerId },
    });

    // Notify influencer if they have a linked user
    if (offer.influencer.userId) {
      await notifyUser(offer.influencer.userId, {
        type: 'OFFER_APPROVED',
        title: 'New offer from a brand',
        body: `${offer.brand.name} sent you an offer — ${offer.currency} ${Number(offer.total).toFixed(2)}`,
        link: `/offers/${offerId}`,
        meta: { offerId },
      });
    }
  } else {
    // Rejected
    await notifyUser(offer.createdBy, {
      type: 'OFFER_REJECTED',
      title: 'Offer rejected — escrow refunded',
      body: `Offer "${offer.title || offer.id.slice(0, 8)}" was rejected. ${offer.currency} ${Number(offer.total).toFixed(2)} returned to your wallet.`,
      link: `/offers/${offerId}`,
      meta: { offerId, refunded: Number(offer.total) },
    });
  }

  return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
}

module.exports = { adminReviewOffer };