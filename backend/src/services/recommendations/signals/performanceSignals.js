// services/recommendations/signals/performanceSignals.js
// ======================================================
// Performance-driven signals — actual campaign results
// This is the "learn from your own campaigns" piece.
// ======================================================

const { computeConfidence } = require('../confidence');

/**
 * Top performing influencer → suggest repeat collaboration
 */
function topPerformingInfluencer(campaigns) {
  // Only consider campaigns with metrics
  const withMetrics = campaigns.filter((c) =>
    c.deliverables?.some((d) => d.metrics?.length > 0)
  );
  if (withMetrics.length < 2) return null;

  // Aggregate revenue per influencer
  const byInfluencer = new Map();
  for (const c of withMetrics) {
    const revenue = (c.deliverables || [])
      .flatMap((d) => d.metrics || [])
      .reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    if (revenue <= 0 || !c.influencerId) continue;

    const key = c.influencerId;
    const prev = byInfluencer.get(key) || { revenue: 0, count: 0, name: null };
    prev.revenue += revenue;
    prev.count += 1;
    byInfluencer.set(key, prev);
  }

  if (byInfluencer.size === 0) return null;

  // Sort by revenue
  const sorted = [...byInfluencer.entries()].sort(
    (a, b) => b[1].revenue - a[1].revenue
  );
  const [topId, top] = sorted[0];

  // Need a name — look up from campaigns
  const refCampaign = withMetrics.find((c) => c.influencerId === topId);
  const influencerName = refCampaign?.influencer?.displayName;

  if (!influencerName || top.revenue < 1000) return null;

  // Compare against median
  const median = sorted[Math.floor(sorted.length / 2)][1].revenue;
  const multiplier = median > 0 ? (top.revenue / median).toFixed(1) : null;

  return {
    id: 'top-performer',
    title: `${influencerName} is your top performer`,
    reason: multiplier && Number(multiplier) >= 1.5
      ? `Generated ${top.revenue.toLocaleString()} revenue (${multiplier}× your median). Consider a follow-up campaign with them.`
      : `Generated ${top.revenue.toLocaleString()} revenue across ${top.count} campaign${top.count === 1 ? '' : 's'}. Great candidate for repeat collaboration.`,
    confidence: computeConfidence({
      count: top.count,
      sampleSize: byInfluencer.size,
      urgency: 'normal',
    }),
    action: 'View analytics',
    category: 'performance',
    link: '/analytics',
    meta: { influencerId: topId, revenue: top.revenue, multiplier },
  };
}

/**
 * Campaigns with low ROI → suggest pausing / rethinking
 */
function lowRoiCampaigns(campaigns) {
  const withMetrics = campaigns.filter((c) =>
    c.deliverables?.some((d) => d.metrics?.length > 0)
  );
  if (withMetrics.length === 0) return null;

  const low = withMetrics.filter((c) => {
    const revenue = (c.deliverables || [])
      .flatMap((d) => d.metrics || [])
      .reduce((sum, m) => sum + Number(m.revenue || 0), 0);
    const spend = Number(c.totalAmount || 0);
    return spend > 0 && revenue / spend < 1;
  });

  if (low.length === 0) return null;

  return {
    id: 'low-roi',
    title: `${low.length} campaign${low.length === 1 ? '' : 's'} below break-even`,
    reason: `Revenue < spend on ${low.length} campaign${low.length === 1 ? '' : 's'}. Review targeting or creator selection before scaling.`,
    confidence: computeConfidence({
      count: low.length,
      sampleSize: withMetrics.length,
      urgency: 'high',
    }),
    action: 'View analytics',
    category: 'performance',
    link: '/analytics',
    meta: { count: low.length },
  };
}

module.exports = {
  topPerformingInfluencer,
  lowRoiCampaigns,
};