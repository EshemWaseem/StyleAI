// services/offers/cancel.js
// ======================================================
// Cancel an offer — brand-side only, before influencer reviews.
// Allowed only: DRAFT, PENDING (influencer hasn't responded yet).
// Escrow is released back to brand wallet.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');
const { writeAudit } = require('../admin/helpers');
const CANCELLABLE_STATUSES = ['DRAFT', 'PENDING'];
const { emitOfferUpdated } = require('../websocket/broadcast');
const STATUS_LABELS = {
  DRAFT: 'Draft',
  PENDING: 'Pending',
  IN_PROGRESS: 'Accepted',
  COMPLETED: 'Completed',
  DECLINED: 'Declined',
  EXPIRED: 'Expired',
  CANCELLED: 'Cancelled',
  // legacy
  PENDING_ADMIN: 'Pending review',
  ADMIN_APPROVED: 'Sent to influencer',
  ADMIN_REJECTED: 'Rejected',
  INFLUENCER_ACCEPTED: 'Accepted',
  INFLUENCER_DECLINED: 'Declined',
};

async function cancelOffer(user, offerId, options = {}) {
  const { reason = null } = options;

  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) {
    throw httpError('Offer not found.', 404, 'NOT_FOUND');
  }

  // ---- Permission ----
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isBrandOwner = user.organizationId === offer.brand.organizationId;

  if (!isAdmin && !isBrandOwner) {
    throw httpError(
      "You don't have permission to cancel this offer. Only the brand that sent it can cancel.",
      403,
      'FORBIDDEN'
    );
  }

  // ---- Status checks with user-friendly messages ----
  if (offer.status === 'CANCELLED') {
    throw httpError(
      'This offer is already cancelled.',
      400,
      'ALREADY_CANCELLED'
    );
  }

  if (offer.status === 'IN_PROGRESS' || offer.status === 'INFLUENCER_ACCEPTED') {
    throw httpError(
      "You can't cancel this offer anymore — the influencer has already accepted it and is working on your content. If you need to stop the collaboration, please reach out to our support team.",
      400,
      'CANNOT_CANCEL_AFTER_ACCEPT'
    );
  }

  if (offer.status === 'COMPLETED') {
    throw httpError(
      "This offer is already completed and can't be cancelled.",
      400,
      'ALREADY_COMPLETED'
    );
  }

  if (offer.status === 'DECLINED' || offer.status === 'INFLUENCER_DECLINED') {
    throw httpError(
      "The influencer already declined this offer — no action needed.",
      400,
      'ALREADY_DECLINED'
    );
  }

  if (offer.status === 'EXPIRED') {
    throw httpError(
      'This offer has already expired.',
      400,
      'ALREADY_EXPIRED'
    );
  }

  if (!CANCELLABLE_STATUSES.includes(offer.status)) {
    // Fallback — unknown status
    const label = STATUS_LABELS[offer.status] || offer.status;
    throw httpError(
      `This offer can't be cancelled right now. Current status: ${label}.`,
      400,
      'NOT_CANCELLABLE'
    );
  }

  // ---- Release escrow if it was held ----
  // Escrow is held during createOffer.
  // Refund the full amount back to brand wallet.
  let escrowRefunded = false;
  if (offer.escrowHeldAt && !offer.escrowReleasedAt) {
    try {
      const walletSvc = require('../wallet');
      if (typeof walletSvc.refundEscrowForOffer === 'function') {
        await walletSvc.refundEscrowForOffer(user.id, offerId);
        escrowRefunded = true;
      } else {
        console.warn(
          '[offers.cancel] refundEscrowForOffer not found in wallet service — skipping'
        );
      }
    } catch (escrowErr) {
      console.error('[offers.cancel] escrow refund failed:', escrowErr.message);
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
        ? `Cancelled by brand: ${String(reason).trim().slice(0, 400)}`
        : offer.adminNote,
    },
    include: { brand: true, influencer: true },
  });

  //  Audit 
  await writeAudit({
    actorId: user.id,
    action: 'offer.cancel',
    targetType: 'CustomOffer',
    targetId: offerId,
    meta: {
      previousStatus: offer.status,
      newStatus: 'CANCELLED',
      reason: reason || null,
      escrowRefunded,
      cancelledBy: isAdmin ? 'admin' : 'brand',
    },
  });

  // Notify influencer 
  if (offer.influencer.userId) {
    try {
      const { notifyUser } = require('../notifications');
      await notifyUser(offer.influencer.userId, {
        type: 'SYSTEM',
        title: 'Offer cancelled',
        body: `${offer.brand.name} cancelled their offer${
          reason ? ` — ${String(reason).trim()}` : ''
        }.`,
        link: `/offers/${offerId}`,
        meta: { offerId, reason: reason || null },
      });
    } catch (notifyErr) {
      console.warn(
        '[offers.cancelOffer] influencer notify failed:',
        notifyErr.message
      );
    }
  }
    //  Real-time: notify influencer
  await emitOfferUpdated({
    id: updated.id,
    status: updated.status,
    title: updated.title,
    brand: updated.brand,
    influencer: updated.influencer,
    createdByAgencyId: updated.createdByAgencyId,
  }, 'cancelled').catch((e) =>
    console.warn('[emitOfferUpdated] failed:', e.message)
  );

  return shapeOffer(updated, {
    brand: updated.brand,
    influencer: updated.influencer,
  });
}

module.exports = { cancelOffer, CANCELLABLE_STATUSES };