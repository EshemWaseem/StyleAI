// services/offers/influencerReview.js
// ======================================================
// ADMIN_APPROVED → INFLUENCER_ACCEPTED | INFLUENCER_DECLINED
// Only the target influencer can act.
// Accept → release escrow (payout) + auto-create campaign.
// Decline → refund brand's escrow.
//
// ✅ NEW: email notifications on accept/decline.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError, shapeOffer } = require('./helpers');
const { writeAudit } = require('../admin/helpers');
const { releaseEscrowForOffer, refundEscrowForOffer } = require('../wallet');
const { notifyUser, notifyAdmins } = require('../notifications');
const { createCampaignFromOffer } = require('../campaigns');

async function influencerReviewOffer(user, offerId, payload = {}) {
  const { decision, influencerNote } = payload;

  if (!['accept', 'decline'].includes(decision)) {
    throw httpError('decision must be "accept" or "decline"', 400, 'INVALID_DECISION');
  }

  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  if (offer.status !== 'ADMIN_APPROVED') {
    throw httpError(
      `Only ADMIN_APPROVED offers can be reviewed (current: ${offer.status})`,
      400,
      'NOT_REVIEWABLE'
    );
  }

  if (offer.influencer.userId !== user.id) {
    throw httpError('Forbidden: only the target influencer can review this offer', 403, 'FORBIDDEN');
  }

  const newStatus =
    decision === 'accept' ? 'INFLUENCER_ACCEPTED' : 'INFLUENCER_DECLINED';

  // ⚡ STEP 1 — Money movement
  if (decision === 'accept') {
    await releaseEscrowForOffer(user.id, offerId);
  } else {
    await refundEscrowForOffer(user.id, offerId);
  }

  // ⚡ STEP 2 — Flip status
  const updated = await prisma.customOffer.update({
    where: { id: offerId },
    data: {
      status: newStatus,
      influencerNote: influencerNote ?? null,
    },
    include: { brand: true, influencer: true },
  });

  // ⚡ STEP 3 — Auto-create campaign (only on accept)
  if (decision === 'accept') {
    try {
      await createCampaignFromOffer(offerId, user.id);
    } catch (err) {
      console.error('[offers.influencerReview] campaign create failed:', err.message);
    }
  }

  // ⚡ STEP 4 — Audit
  await writeAudit({
    actorId: user.id,
    action: `offer.influencer.${decision}`,
    targetType: 'CustomOffer',
    targetId: offerId,
    meta: {
      previousStatus: 'ADMIN_APPROVED',
      newStatus,
      influencerNote: influencerNote ?? null,
      escrowAction: decision === 'accept' ? 'released' : 'refunded',
      totalAmount: Number(offer.total),
      currency: offer.currency,
    },
  });

  // ⚡ STEP 5 — Notifications
  const amountStr = `${offer.currency} ${Number(offer.total).toFixed(2)}`;
  const offerTitle = offer.title || `Offer #${offerId.slice(0, 8)}`;

  // Brand owner user — for email
  const brandOwner = await prisma.user.findFirst({
    where: {
      organizationId: offer.brand.organizationId,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
  const brandOwnerUserId = brandOwner?.id || offer.createdBy;

  if (decision === 'accept') {
    await notifyUser(brandOwnerUserId, {
      type: 'OFFER_ACCEPTED',
      title: 'Offer accepted 🎉',
      body: `${offer.influencer.displayName} accepted your offer (${amountStr}).`,
      link: `/offers/${offerId}`,
      meta: { offerId },
      // ✅ EMAIL
      emailTemplate: 'offerAccepted',
      emailData: {
        brandName: offer.brand.name,
        influencerName: offer.influencer.displayName,
        offerTitle,
        amount: Number(offer.total),
        currency: offer.currency,
      },
    });

    await notifyAdmins({
      type: 'OFFER_ACCEPTED',
      title: 'Offer accepted',
      body: `${offer.influencer.displayName} accepted offer from ${offer.brand.name} (${amountStr}).`,
      link: `/offers/${offerId}`,
      meta: { offerId },
    });

    if (offer.influencer.userId) {
      await notifyUser(offer.influencer.userId, {
        type: 'PAYOUT_RECEIVED',
        title: 'Payout received',
        body: `Funds for "${offer.title || offerId.slice(0, 8)}" have been credited to your wallet.`,
        link: `/wallet`,
        meta: { offerId },
      });
    }
  } else {
    await notifyUser(brandOwnerUserId, {
      type: 'OFFER_DECLINED',
      title: 'Offer declined — escrow refunded',
      body: `${offer.influencer.displayName} declined. ${amountStr} returned to your wallet.`,
      link: `/offers/${offerId}`,
      meta: { offerId, refunded: Number(offer.total) },
      // ✅ EMAIL
      emailTemplate: 'offerDeclined',
      emailData: {
        brandName: offer.brand.name,
        influencerName: offer.influencer.displayName,
        offerTitle,
        reason: influencerNote || 'Not specified',
      },
    });

    await notifyAdmins({
      type: 'OFFER_DECLINED',
      title: 'Offer declined by influencer',
      body: `${offer.influencer.displayName} declined offer from ${offer.brand.name} (${amountStr}).`,
      link: `/offers/${offerId}`,
      meta: { offerId },
    });
  }

  return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
}

module.exports = { influencerReviewOffer };






// 02-10
// // services/offers/influencerReview.js
// // ======================================================
// // ADMIN_APPROVED → INFLUENCER_ACCEPTED | INFLUENCER_DECLINED
// // Only the target influencer can act.
// // Accept → release escrow (payout) + auto-create campaign.
// // Decline → refund brand's escrow.
// // ======================================================

// const prisma = require('../../config/prisma');
// const { httpError, shapeOffer } = require('./helpers');
// const { writeAudit } = require('../admin/helpers');
// const { releaseEscrowForOffer, refundEscrowForOffer } = require('../wallet');
// const { notifyUser, notifyAdmins } = require('../notifications');
// const { createCampaignFromOffer } = require('../campaigns');

// async function influencerReviewOffer(user, offerId, payload = {}) {
//   const { decision, influencerNote } = payload;

//   if (!['accept', 'decline'].includes(decision)) {
//     throw httpError('decision must be "accept" or "decline"', 400, 'INVALID_DECISION');
//   }

//   const offer = await prisma.customOffer.findUnique({
//     where: { id: offerId },
//     include: { brand: true, influencer: true },
//   });
//   if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

//   if (offer.status !== 'ADMIN_APPROVED') {
//     throw httpError(
//       `Only ADMIN_APPROVED offers can be reviewed (current: ${offer.status})`,
//       400,
//       'NOT_REVIEWABLE'
//     );
//   }

//   if (offer.influencer.userId !== user.id) {
//     throw httpError('Forbidden: only the target influencer can review this offer', 403, 'FORBIDDEN');
//   }

//   const newStatus =
//     decision === 'accept' ? 'INFLUENCER_ACCEPTED' : 'INFLUENCER_DECLINED';

//   // ⚡ STEP 1 — Money movement (before status flip)
//   // Accept  → release escrow → influencer wallet gets payout (minus inf. fee)
//   // Decline → refund escrow → brand wallet gets full amount back
//   if (decision === 'accept') {
//     await releaseEscrowForOffer(user.id, offerId);
//   } else {
//     await refundEscrowForOffer(user.id, offerId);
//   }

//   // ⚡ STEP 2 — Flip status
//   const updated = await prisma.customOffer.update({
//     where: { id: offerId },
//     data: {
//       status: newStatus,
//       influencerNote: influencerNote ?? null,
//     },
//     include: { brand: true, influencer: true },
//   });

//   // ⚡ STEP 3 — Auto-create campaign (only on accept, AFTER status is INFLUENCER_ACCEPTED)
//   if (decision === 'accept') {
//     try {
//       await createCampaignFromOffer(offerId, user.id);
//     } catch (err) {
//       // Non-fatal — offer still counts as accepted
//       console.error('[offers.influencerReview] campaign create failed:', err.message);
//     }
//   }

//   // ⚡ STEP 4 — Audit
//   await writeAudit({
//     actorId: user.id,
//     action: `offer.influencer.${decision}`,
//     targetType: 'CustomOffer',
//     targetId: offerId,
//     meta: {
//       previousStatus: 'ADMIN_APPROVED',
//       newStatus,
//       influencerNote: influencerNote ?? null,
//       escrowAction: decision === 'accept' ? 'released' : 'refunded',
//       totalAmount: Number(offer.total),
//       currency: offer.currency,
//     },
//   });

//   // ⚡ STEP 5 — Notifications
//   const amountStr = `${offer.currency} ${Number(offer.total).toFixed(2)}`;

//   if (decision === 'accept') {
//     await notifyUser(offer.createdBy, {
//       type: 'OFFER_ACCEPTED',
//       title: 'Offer accepted 🎉',
//       body: `${offer.influencer.displayName} accepted your offer (${amountStr}).`,
//       link: `/offers/${offerId}`,
//       meta: { offerId },
//     });

//     await notifyAdmins({
//       type: 'OFFER_ACCEPTED',
//       title: 'Offer accepted',
//       body: `${offer.influencer.displayName} accepted offer from ${offer.brand.name} (${amountStr}).`,
//       link: `/offers/${offerId}`,
//       meta: { offerId },
//     });

//     if (offer.influencer.userId) {
//       await notifyUser(offer.influencer.userId, {
//         type: 'PAYOUT_RECEIVED',
//         title: 'Payout received',
//         body: `Funds for "${offer.title || offerId.slice(0, 8)}" have been credited to your wallet.`,
//         link: `/wallet`,
//         meta: { offerId },
//       });
//     }
//   } else {
//     await notifyUser(offer.createdBy, {
//       type: 'OFFER_DECLINED',
//       title: 'Offer declined — escrow refunded',
//       body: `${offer.influencer.displayName} declined. ${amountStr} returned to your wallet.`,
//       link: `/offers/${offerId}`,
//       meta: { offerId, refunded: Number(offer.total) },
//     });

//     await notifyAdmins({
//       type: 'OFFER_DECLINED',
//       title: 'Offer declined by influencer',
//       body: `${offer.influencer.displayName} declined offer from ${offer.brand.name} (${amountStr}).`,
//       link: `/offers/${offerId}`,
//       meta: { offerId },
//     });
//   }

//   return shapeOffer(updated, { brand: updated.brand, influencer: updated.influencer });
// }

// module.exports = { influencerReviewOffer };