// services/analytics/platform.js
// ======================================================
// Platform-wide analytics (SUPER_ADMIN only)
// ======================================================

const prisma = require('../../config/prisma');

async function getPlatformAnalytics() {
  const [offerStats, campaignStats, walletStats, metricTotals] = await Promise.all([
    prisma.customOffer.groupBy({
      by: ['status'],
      _count: { _all: true },
      _sum: { total: true, adminFee: true },
    }),
    prisma.campaign.aggregate({
      _sum: {
        reach: true, impressions: true, clicks: true,
        conversions: true, revenue: true, totalAmount: true,
      },
      _count: { _all: true },
    }),
    prisma.wallet.aggregate({ _sum: { balanceCache: true } }),
    prisma.deliverableMetric.aggregate({
      _sum: {
        reach: true, impressions: true, likes: true, comments: true,
        shares: true, clicks: true, conversions: true, revenue: true,
      },
    }),
  ]);

  return {
    offers: offerStats.map((s) => ({
      status: s.status,
      count: s._count._all,
      totalVolume: Number(s._sum.total || 0),
      platformFee: Number(s._sum.adminFee || 0),
    })),
    campaigns: {
      count: campaignStats._count._all,
      reach: campaignStats._sum.reach || 0,
      impressions: campaignStats._sum.impressions || 0,
      clicks: campaignStats._sum.clicks || 0,
      conversions: campaignStats._sum.conversions || 0,
      revenue: Number(campaignStats._sum.revenue || 0),
      budgetDeployed: Number(campaignStats._sum.totalAmount || 0),
    },
    deliverableTotals: {
      reach: metricTotals._sum.reach || 0,
      impressions: metricTotals._sum.impressions || 0,
      likes: metricTotals._sum.likes || 0,
      comments: metricTotals._sum.comments || 0,
      shares: metricTotals._sum.shares || 0,
      clicks: metricTotals._sum.clicks || 0,
      conversions: metricTotals._sum.conversions || 0,
      revenue: Number(metricTotals._sum.revenue || 0),
    },
    walletsHeld: Number(walletStats._sum.balanceCache || 0),
  };
}

module.exports = { getPlatformAnalytics };