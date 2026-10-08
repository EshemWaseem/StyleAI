// services/recommendations/forBrand.js
// ======================================================
// Main orchestrator — REAL data-driven recommendations
// Priority-sorted, performance-aware.
// ======================================================

const prisma = require('../../config/prisma');
const { product, campaign, offer, performance, tips } = require('./signals');
const { safeSignal, compactSignals, shapeResponse, sortByPriority } = require('./helpers');

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
        influencer: { select: { id: true, displayName: true } },
        deliverables: {
          include: {
            submissions: true,
            metrics: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 30,
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

  const offersWithNames = offers.map((o) => ({
    ...o,
    influencerName: o.influencer?.displayName,
  }));

  // ---- Signals (ordered by impact) ----
  const signals = [
    // 🔴 Critical — blockers
    safeSignal(performance.lowRoiCampaigns, campaigns),
    safeSignal(campaign.campaignsNeedingApproval, campaigns),
    safeSignal(tips.lowWalletBalance, wallet),

    // 🟠 High — needs action soon
    safeSignal(campaign.campaignsWithoutDeliverables, campaigns),
    safeSignal(offer.offersPending, offersWithNames),
    safeSignal(tips.stalePendingOffers, offersWithNames),
    safeSignal(product.productsMissingAi, products),
    safeSignal(product.productsWithoutCategory, products),

    // 🟡 Medium — optimization
    safeSignal(performance.topPerformingInfluencer, campaigns),
    safeSignal(offer.offersInProgress, offersWithNames),
    safeSignal(campaign.draftCampaigns, campaigns),
    safeSignal(tips.fewProducts, products),

    // 🟢 Low — strategy / growth
    safeSignal(campaign.noCampaignsYet, campaigns, products),
    safeSignal(product.noProducts, products),
    safeSignal(tips.noSavedInfluencers, savedInfluencersCount),
    safeSignal(offer.offersRecentlyCompleted, offersWithNames),
  ];

  // Sort by confidence desc + priority asc
  const recs = sortByPriority(compactSignals(signals, 8));

  return shapeResponse(recs);
}

module.exports = { forBrand };