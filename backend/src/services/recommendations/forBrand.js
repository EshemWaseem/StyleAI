// services/recommendations/forBrand.js
// ======================================================
// Main orchestrator — builds recommendations for a brand
// ======================================================

const prisma = require('../../config/prisma');
const { product, campaign, tips } = require('./signals');
const { safeSignal, compactSignals, shapeResponse } = require('./helpers');

const MIN_RECOMMENDATIONS = 3;

async function forBrand(user) {
  const empty = shapeResponse([]);

  const orgId = user?.organizationId;
  if (!orgId) return empty;

  const brand = await prisma.brand.findFirst({
    where: { organizationId: orgId },
    select: { id: true, name: true },
  });
  if (!brand) return empty;

  const [campaigns, products] = await Promise.all([
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
  ]);

  const signals = [
    safeSignal(product.noProducts, products),
    safeSignal(product.productsMissingAi, products),
    safeSignal(product.productsWithoutCategory, products),
    safeSignal(campaign.campaignsNeedingApproval, campaigns),
    safeSignal(campaign.campaignsWithoutDeliverables, campaigns),
    safeSignal(campaign.draftCampaigns, campaigns),
    safeSignal(campaign.noCampaignsYet, campaigns, products),
  ];

  let recs = compactSignals(signals);

  const usedIds = recs.map((r) => r.id);
  while (recs.length < MIN_RECOMMENDATIONS) {
    const tip = tips.nextFallbackTip(usedIds);
    if (!tip) break;
    recs.push(tip);
    usedIds.push(tip.id);
  }

  return shapeResponse(recs.slice(0, 6));
}

module.exports = { forBrand };