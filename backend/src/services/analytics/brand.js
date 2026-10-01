// services/analytics/brand.js
// ======================================================
// Brand analytics — single organization's campaigns
// ======================================================

const prisma = require('../../config/prisma');
const { sumCampaignTotals, rollupBy, shapeRecentCampaigns } = require('./helpers');

async function getBrandAnalytics(organizationId) {
  const campaigns = await prisma.campaign.findMany({
    where: { brand: { organizationId } },
    include: {
      brand: { select: { id: true, name: true } },
      influencer: { select: { id: true, displayName: true, username: true, avatarUrl: true } },
      deliverables: { select: { id: true, status: true, platform: true, contentType: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = sumCampaignTotals(campaigns);

  const byInfluencer = rollupBy(
    campaigns,
    (c) => c.influencerId,
    (c) => ({
      influencer: c.influencer,
      campaigns: 0,
      reach: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, budget: 0,
    })
  );

  return {
    summary: totals,
    roi: totals.budget > 0 ? totals.revenue / totals.budget : 0,
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === 'ACTIVE').length,
    completedCampaigns: campaigns.filter((c) => c.status === 'COMPLETED').length,
    byInfluencer,
    recentCampaigns: shapeRecentCampaigns(campaigns, { take: 10 }).map((c, i) => ({
      ...c,
      influencer: campaigns[i].influencer,
    })),
  };
}

module.exports = { getBrandAnalytics };