// services/campaigns/create.js
// ======================================================
// Auto-create campaign when an offer is accepted.
// Idempotent — safe to call twice.
// Propagates product + agency from the offer.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { shapeCampaign } = require('./helpers');

const DEFAULT_DURATION_DAYS = 14;

async function createCampaignFromOffer(offerId, actorUserId) {
  const offer = await prisma.customOffer.findUnique({
    where: { id: offerId },
    include: {
      brand: true,
      influencer: true,
      campaign: true,
    },
  });

  if (!offer) throw httpError('Offer not found', 404, 'NOT_FOUND');

  if (offer.status !== 'INFLUENCER_ACCEPTED') {
    throw httpError('Offer must be accepted first', 400, 'OFFER_NOT_ACCEPTED');
  }

  // Idempotent — if already created, return it
  if (offer.campaign) {
    return shapeCampaign(offer.campaign);
  }

  const items = Array.isArray(offer.items) ? offer.items : [];
  if (items.length === 0) {
    throw httpError('Cannot create campaign: offer has no items', 400, 'NO_ITEMS');
  }

  const now = new Date();
  const dueDate = new Date(
    now.getTime() + DEFAULT_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  // ------------------------------------------------------
  // Create campaign + deliverables in one transaction
  // ------------------------------------------------------
  const campaign = await prisma.campaign.create({
    data: {
      offerId: offer.id,
      brandId: offer.brandId,
      influencerId: offer.influencerId,
      productId: offer.productId ?? null,
      agencyId: offer.createdByAgencyId ?? null,
      title: offer.title || `Campaign #${offer.id.slice(0, 8)}`,
      description: null,
      currency: offer.currency,
      totalAmount: Number(offer.total),
      status: 'ACTIVE',
      startDate: now,
      dueDate,
      deliverables: {
        create: items.map((item) => ({
          platform: item.platform,
          contentType: item.contentType,
          quantity: item.quantity ?? 1,
          dueDate,
          status: 'PENDING',
        })),
      },
    },
    include: {
      brand: true,
      influencer: true,
      product: { include: { images: true } },
      agency: true,
      deliverables: {
        include: {
          submissions: { orderBy: { createdAt: 'desc' } },
          publishes: { orderBy: { postedAt: 'desc' } },
          metrics: { orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return shapeCampaign(campaign);
}

module.exports = { createCampaignFromOffer };