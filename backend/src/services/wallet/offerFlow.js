// services/wallet/offerFlow.js
// ======================================================
// Money movement tied to CustomOffer lifecycle.
// All operations run in Prisma transactions — atomic.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const {
  getFinanceRules, ensureWallet, postTransaction,
} = require('./helpers');

// ======================================================
// OFFER_HOLD — brand funds escrow when submitting to admin
// Debits brand wallet: full offer total (already includes brand fee)
// ======================================================
async function holdEscrowForOffer(actorUserId, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true },
  });
  if (!offer) throw httpError('Offer not found', 404);
  if (offer.escrowHeldAt) throw httpError('Escrow already held', 400, 'ALREADY_HELD');

  const brandWallet = await ensureWallet(
    { type: 'organization', id: offer.brand.organizationId },
    offer.currency
  );

  return prisma.$transaction(async (tx) => {
    await postTransaction(tx, {
      walletId: brandWallet.id,
      type: 'OFFER_HOLD',
      amount: -Number(offer.total),
      currency: offer.currency,
      offerId: offer.id,
      note: `Escrow hold for offer #${offer.id.slice(0, 8)}`,
      createdBy: actorUserId,
    });

    return tx.customOffer.update({
      where: { id: offer.id },
      data: { escrowHeldAt: new Date() },
    });
  });
}

// ======================================================
// OFFER_RELEASE — influencer accepts → money flows
// ======================================================
async function releaseEscrowForOffer(actorUserId, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true, influencer: true },
  });
  if (!offer) throw httpError('Offer not found', 404);
  if (!offer.escrowHeldAt) throw httpError('Escrow not held', 400, 'NO_ESCROW');
  if (offer.escrowReleasedAt) throw httpError('Escrow already released', 400, 'ALREADY_RELEASED');

  const finance = await getFinanceRules();
  const influencerPct = Number(finance.influencerCommissionPct ?? 5);

  // Total = subtotal - discount + brand fee
  // Brand fee = adminFee already stored on offer
  const totalPaid = Number(offer.total);
  const brandFee = Number(offer.adminFee);         // already charged to brand
  const subtotalAfterDiscount = totalPaid - brandFee;
  const influencerFee = Math.round(subtotalAfterDiscount * (influencerPct / 100) * 100) / 100;
  const influencerPayout = Math.round((subtotalAfterDiscount - influencerFee) * 100) / 100;
  const platformRevenue = Math.round((brandFee + influencerFee) * 100) / 100;

  const infWallet = await ensureWallet(
    { type: 'influencer', id: offer.influencerId },
    offer.currency
  );

  return prisma.$transaction(async (tx) => {
    // 1. Credit influencer
    await postTransaction(tx, {
      walletId: infWallet.id,
      type: 'OFFER_RELEASE',
      amount: influencerPayout,
      currency: offer.currency,
      offerId: offer.id,
      note: `Payout for offer #${offer.id.slice(0, 8)} (after ${influencerPct}% fee)`,
      createdBy: actorUserId,
      meta: { subtotalAfterDiscount, influencerFee, influencerPayout },
    });

    // 2. Platform revenue ledger row (on influencer wallet for reporting)
    await postTransaction(tx, {
      walletId: infWallet.id,
      type: 'PLATFORM_FEE',
      amount: 0, // recorded for reference; real platform revenue is a ledger entry with zero balance impact
      currency: offer.currency,
      offerId: offer.id,
      note: `Platform fee: brand ${brandFee} + influencer ${influencerFee} = ${platformRevenue}`,
      createdBy: actorUserId,
      meta: { brandFee, influencerFee, platformRevenue },
    });

    return tx.customOffer.update({
      where: { id: offer.id },
      data: { escrowReleasedAt: new Date() },
    });
  });
}

// ======================================================
// OFFER_REFUND — admin rejects or offer expires → brand gets money back
// ======================================================
async function refundEscrowForOffer(actorUserId, offerId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: { brand: true },
  });
  if (!offer) throw httpError('Offer not found', 404);
  if (!offer.escrowHeldAt) throw httpError('Escrow not held', 400, 'NO_ESCROW');
  if (offer.escrowReleasedAt) throw httpError('Escrow already released', 400, 'ALREADY_RELEASED');

  const brandWallet = await ensureWallet(
    { type: 'organization', id: offer.brand.organizationId },
    offer.currency
  );

  return prisma.$transaction(async (tx) => {
    await postTransaction(tx, {
      walletId: brandWallet.id,
      type: 'OFFER_REFUND',
      amount: Number(offer.total),
      currency: offer.currency,
      offerId: offer.id,
      note: `Refund for offer #${offer.id.slice(0, 8)}`,
      createdBy: actorUserId,
    });

    return tx.customOffer.update({
      where: { id: offer.id },
      data: { escrowReleasedAt: new Date() },
    });
  });
}

module.exports = {
  holdEscrowForOffer,
  releaseEscrowForOffer,
  refundEscrowForOffer,
};