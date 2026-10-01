// services/analytics/agency.js
// ======================================================
// Agency analytics — across all client brands
// ======================================================

const prisma = require('../../config/prisma');
const { sumCampaignTotals, rollupBy, shapeRecentCampaigns } = require('./helpers');

async function getAgencyAnalytics(agencyOrganizationId) {
  const campaigns = await prisma.campaign.findMany({
    where: { agencyId: agencyOrganizationId },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      influencer: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = sumCampaignTotals(campaigns);

  const byBrand = rollupBy(
    campaigns,
    (c) => c.brandId,
    (c) => ({
      brand: c.brand,
      campaigns: 0,
      reach: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, budget: 0,
    })
  );

  return {
    summary: totals,
    roi: totals.budget > 0 ? totals.revenue / totals.budget : 0,
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === 'ACTIVE').length,
    byBrand,
    recentCampaigns: shapeRecentCampaigns(campaigns, { take: 10, includeBrand: true }).map((c, i) => ({
      ...c,
      influencer: campaigns[i].influencer,
    })),
  };
}

module.exports = { getAgencyAnalytics };