// services/analytics/brand.js
// ======================================================
// Brand analytics — single organization's campaigns
// Returns business metrics (spend/campaigns) + performance (reach/revenue)
// ======================================================

const prisma = require('../../config/prisma');
const { sumCampaignTotals, rollupBy, shapeRecentCampaigns } = require('./helpers');

async function getBrandAnalytics(organizationId) {
  const campaigns = await prisma.campaign.findMany({
    where: { brand: { organizationId } },
    include: {
      brand: { select: { id: true, name: true } },
      influencer: {
        select: { id: true, displayName: true, username: true, avatarUrl: true },
      },
      deliverables: {
        select: { id: true, status: true, platform: true, contentType: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = sumCampaignTotals(campaigns);

  // ---- Business-level metrics (available immediately after campaign create) ----
  const totalSpend = campaigns.reduce(
    (sum, c) => sum + (Number(c.totalAmount) || 0),
    0
  );

  const activeCampaigns = campaigns.filter(
    (c) => !['COMPLETED', 'CANCELLED'].includes(c.status)
  ).length;

  const completedCampaigns = campaigns.filter((c) => c.status === 'COMPLETED').length;

  // Deliverable stats (across all campaigns)
  const allDeliverables = campaigns.flatMap((c) => c.deliverables || []);
  const deliverableCount = allDeliverables.length;
  const pendingApprovals = allDeliverables.filter((d) =>
    ['FINAL_UPLOADED', 'BRAND_REVIEW'].includes(d.status)
  ).length;
  const publishedCount = allDeliverables.filter((d) =>
    ['PUBLISHED', 'METRICS_ENTERED', 'COMPLETED'].includes(d.status)
  ).length;

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
    summary: {
      ...totals,
      totalSpend,
      budget: totalSpend, // alias for backward compat
    },
    roi: totals.budget > 0 ? totals.revenue / totals.budget : 0,
    campaignCount: campaigns.length,
    activeCampaigns,
    completedCampaigns,
    deliverableCount,
    pendingApprovals,
    publishedCount,
    currency: campaigns[0]?.currency || 'PKR',
    byInfluencer,
    recentCampaigns: shapeRecentCampaigns(campaigns, { take: 10 }).map((c, i) => ({
      ...c,
      influencer: campaigns[i].influencer,
    })),
  };
}

module.exports = { getBrandAnalytics };