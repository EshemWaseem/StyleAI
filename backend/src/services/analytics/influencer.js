// services/analytics/influencer.js
// ======================================================
// Influencer analytics — their own campaigns
// ======================================================

const prisma = require('../../config/prisma');
const { sumCampaignTotals, shapeRecentCampaigns } = require('./helpers');

async function getInfluencerAnalytics(user) {
  const inf = await prisma.influencer.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });
  if (!inf) return null;

  const campaigns = await prisma.campaign.findMany({
    where: { influencerId: inf.id },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      agency: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const totals = sumCampaignTotals(campaigns, { includeEarnings: true });

  return {
    summary: totals,
    currency: campaigns[0]?.currency || 'PKR',
    campaignCount: campaigns.length,
    activeCampaigns: campaigns.filter((c) => c.status === 'ACTIVE').length,
    completedCampaigns: campaigns.filter((c) => c.status === 'COMPLETED').length,
    recentCampaigns: shapeRecentCampaigns(campaigns, { take: 10, includeBrand: true, includeAgency: true }),
  };
}

module.exports = { getInfluencerAnalytics };