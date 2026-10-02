// services/offers/cancel.js
// ======================================================
// Cancel an offer — brand-side only, before influencer reviews.
// Releases escrow back to brand wallet.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');
const { writeAudit } = require('../admin/helpers');

// Cancellable states — as long as influencer hasn't touched it yet
const CANCELLABLE_STATUSES = ['DRAFT', 'PENDING_ADMIN', 'ADMIN_APPROVED'];

async function cancelOffer(user, offerId, options = {}) {
  const { reason = null } = options;

  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  // ---- Permission ----
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandOwner = user.organizationId === offer.brand.organizationId;

  if (!isAdmin && !isBrandOwner) {
    throw httpError(
      'Forbidden: only the offering brand or an admin can cancel',
      403,
      'FORBIDDEN'
    );
  }

  // ---- Status check ----
  if (!CANCELLABLE_STATUSES.includes(offer.status)) {
    throw httpError(
      `Offer cannot be cancelled in status "${offer.status}". ` +
        `Only ${CANCELLABLE_STATUSES.join(', ')} can be cancelled.`,
      400,
      'NOT_CANCELLABLE'
    );
  }

  // ---- Release escrow if it was held ----
  // Escrow is held during createOffer (Sprint 27 direct-to-influencer flow).
  // For DRAFT offers that were never submitted (legacy), escrow may not exist.
  let escrowReleased = false;
  if (offer.status !== 'DRAFT') {
    try {
      const walletSvc = require('../wallet');
      if (typeof walletSvc.releaseEscrowForOffer === 'function') {
        await walletSvc.releaseEscrowForOffer(user.id, offerId, {
          reason: 'offer_cancelled',
        });
        escrowReleased = true;
      } else {
        console.warn(
          '[offers.cancel] releaseEscrowForOffer not found in wallet service — skipping'
        );
      }
    } catch (escrowErr) {
      console.error('[offers.cancel] escrow release failed:', escrowErr.message);
      // Don't block cancel — escrow can be reconciled separately
      // But log it clearly
    }
  }

  // ---- Update status ----
  const updated = await prisma.customOffer.update({
    where: { id: offerId },
    data: {
      status: 'CANCELLED',
      adminNote: reason
        ? `Cancelled by brand: ${reason}`.slice(0, 500)
        : offer.adminNote,
    },
    include: { brand: true, influencer: true },
  });

  // ---- Audit ----
  await writeAudit({
    actorId: user.id,
    action: 'offer.cancel',
    targetType: 'CustomOffer',
    targetId: offerId,
    meta: {
      previousStatus: offer.status,
      newStatus: 'CANCELLED',
      reason: reason || null,
      escrowReleased,
      cancelledBy: isAdmin ? 'admin' : 'brand',
    },
  });

  return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
}

module.exports = { cancelOffer, CANCELLABLE_STATUSES };