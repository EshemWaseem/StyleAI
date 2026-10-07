// services/recommendations/forBrand.js
// ======================================================
// Main orchestrator — builds REAL data-driven recommendations
// No fake generic tips. Only signals backed by actual data.
// ======================================================

const prisma = require('../../config/prisma');
const { product, campaign, offer, tips } = require('./signals');
const { safeSignal, compactSignals, shapeResponse } = require('./helpers');

async function forBrand(user) {
  const empty = shapeResponse([]);

  const orgId = user?.organizationId;
  if (!orgId) return empty;

  const brand = await prisma.brand.findFirst({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });
  if (!brand) return empty;

  // ---- Fetch real data (parallel) ----
  const [
    campaigns,
    products,
    offers,
    wallet,
    savedInfluencersCount,
  ] = await Promise.all([
    prisma.campaign.findMany({
      where: { brandId: brand.id },
      include: {
        deliverables: {
          include: {
            submissions: true,
            metrics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    }),
    prisma.product.findMany({
      where: { brandId: brand.id },
      select: { id: true, name: true, category: true, aiContent: true },
      take: 50,
    }),
    prisma.customOffer.findMany({
      where: { brandId: brand.id },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        influencer: { select: { displayName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }).catch(() => []),
    prisma.wallet.findFirst({
      where: { organizationId: orgId },
      select: { balanceCache: true, currency: true },
    }).catch(() => null),
    prisma.organizationInfluencer.count({
      where: { organizationId: orgId },
    }).catch(() => 0),
  ]);

  // Add influencerName to offers for better messaging
  const offersWithNames = offers.map((o) => ({
    ...o,
    influencerName: o.influencer?.displayName,
  }));

  // ---- Real signals ----
  const signals = [
    // Products
    safeSignal(product.noProducts, products),
    safeSignal(product.productsMissingAi, products),
    safeSignal(product.productsWithoutCategory, products),
    safeSignal(tips.fewProducts, products),

    // Campaigns
    safeSignal(campaign.campaignsNeedingApproval, campaigns),
    safeSignal(campaign.campaignsWithoutDeliverables, campaigns),
    safeSignal(campaign.draftCampaigns, campaigns),
    safeSignal(campaign.noCampaignsYet, campaigns, products),

    // Offers (NEW)
    safeSignal(offer.offersPending, offersWithNames),
    safeSignal(offer.offersInProgress, offersWithNames),
    safeSignal(offer.offersRecentlyCompleted, offersWithNames),
    safeSignal(tips.stalePendingOffers, offersWithNames),

    // Wallet / Finance (NEW)
    safeSignal(tips.lowWalletBalance, wallet),

    // Strategy (NEW)
    safeSignal(tips.noSavedInfluencers, savedInfluencersCount),
  ];

  // ---- Filter + cap ----
  // NO minimum — show real signals only (1-6 recommendations)
  const recs = compactSignals(signals, 6);

  return shapeResponse(recs);
}

module.exports = { forBrand };