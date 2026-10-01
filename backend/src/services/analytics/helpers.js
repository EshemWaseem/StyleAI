// services/analytics/helpers.js
// ======================================================
// Shared helpers for analytics domain
// ======================================================

/**
 * Sum multiple campaign metrics into a single rollup.
 * Used by brand/agency/influencer analytics.
 */
function sumCampaignTotals(campaigns, { includeEarnings = false } = {}) {
  const acc = campaigns.reduce(
    (acc, c) => ({
      reach: acc.reach + (c.reach || 0),
      impressions: acc.impressions + (c.impressions || 0),
      clicks: acc.clicks + (c.clicks || 0),
      conversions: acc.conversions + (c.conversions || 0),
      revenue: acc.revenue + Number(c.revenue || 0),
      budget: acc.budget + Number(c.totalAmount || 0),
    }),
    { reach: 0, impressions: 0, clicks: 0, conversions: 0, revenue: 0, budget: 0 }
  );
  if (includeEarnings) acc.earnings = acc.budget;
  return acc;
}

/**
 * Roll up campaigns by a key (e.g. influencerId, brandId).
 * Shape: { [key]: { campaigns, reach, impressions, clicks, conversions, revenue, budget } }
 */
function rollupBy(campaigns, keySelector, shapeFn) {
  const map = new Map();
  for (const c of campaigns) {
    const key = keySelector(c);
    const prev = map.get(key) || shapeFn(c);
    prev.campaigns += 1;
    prev.reach += c.reach || 0;
    prev.impressions += c.impressions || 0;
    prev.clicks += c.clicks || 0;
    prev.conversions += c.conversions || 0;
    prev.revenue += Number(c.revenue || 0);
    prev.budget += Number(c.totalAmount || 0);
    map.set(key, prev);
  }
  return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue);
}

/**
 * Lightweight "recent campaigns" shaping.
 */
function shapeRecentCampaigns(campaigns, { take = 10, includeBrand = false, includeAgency = false } = {}) {
  return campaigns.slice(0, take).map((c) => {
    const out = {
      id: c.id,
      title: c.title,
      status: c.status,
      currency: c.currency,
      totalAmount: Number(c.totalAmount),
      revenue: Number(c.revenue || 0),
      reach: c.reach,
    };
    if (includeBrand) out.brand = c.brand;
    if (includeAgency) out.agency = c.agency;
    return out;
  });
}

module.exports = {
  sumCampaignTotals,
  rollupBy,
  shapeRecentCampaigns,
};