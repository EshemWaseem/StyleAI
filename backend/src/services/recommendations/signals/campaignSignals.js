// services/recommendations/signals/campaignSignals.js
// ======================================================
// Campaign signals — enriched with real names, dynamic confidence
// ======================================================

const { computeConfidence } = require('../confidence');

function campaignsNeedingApproval(campaigns) {
  const needs = campaigns.filter((c) =>
    c.deliverables?.some((d) =>
      d.submissions?.some((s) => s.status === 'PENDING')
    )
  );
  if (needs.length === 0) return null;

  // Find oldest pending submission for urgency
  let oldestDays = 0;
  for (const c of needs) {
    for (const d of c.deliverables || []) {
      for (const s of d.submissions || []) {
        if (s.status === 'PENDING') {
          const days = (Date.now() - new Date(s.createdAt).getTime()) / 86400000;
          if (days > oldestDays) oldestDays = days;
        }
      }
    }
  }

  const urgency = oldestDays > 7 ? 'critical' : oldestDays > 3 ? 'high' : 'normal';
  const sample = needs[0].title ? `"${needs[0].title}"` : `${needs.length} campaigns`;
  const more = needs.length - 1;

  return {
    id: 'campaign-approval',
    title: `${needs.length} campaign${needs.length === 1 ? '' : 's'} awaiting your approval`,
    reason: `${sample}${more > 0 ? ` and ${more} more` : ''} — creator${needs.length === 1 ? '' : 's'} submitted content${oldestDays > 0 ? ` (oldest: ${Math.floor(oldestDays)}d ago)` : ''}. Review to keep campaigns moving.`,
    confidence: computeConfidence({
      count: needs.length,
      sampleSize: campaigns.length,
      ageDays: oldestDays,
      urgency,
    }),
    action: 'Open campaigns',
    category: 'campaign',
    link: '/campaigns',
    meta: { count: needs.length, oldestDays: Math.floor(oldestDays) },
  };
}

function campaignsWithoutDeliverables(campaigns) {
  const empty = campaigns.filter(
    (c) => !c.deliverables || c.deliverables.length === 0
  );
  if (empty.length === 0) return null;

  const sample = empty[0].title ? `"${empty[0].title}"` : `${empty.length} campaigns`;

  return {
    id: 'campaign-empty',
    title: `${empty.length} campaign${empty.length === 1 ? '' : 's'} with no deliverables`,
    reason: `${sample} — add influencers and create deliverables to launch.`,
    confidence: computeConfidence({
      count: empty.length,
      sampleSize: campaigns.length,
      urgency: 'high',
    }),
    action: 'Review campaigns',
    category: 'campaign',
    link: '/campaigns',
    meta: { count: empty.length },
  };
}

function noCampaignsYet(campaigns, products) {
  if (campaigns.length > 0 || products.length === 0) return null;

  const topProduct = products[0]?.name;
  const more = products.length - 1;

  return {
    id: 'first-campaign',
    title: 'Launch your first campaign',
    reason: `You have ${products.length} product${products.length === 1 ? '' : 's'} ready${topProduct ? ` — start with "${topProduct}"${more > 0 ? ` and ${more} more` : ''}` : ''}. Use AI matching to find the right creators.`,
    confidence: 90,
    action: 'Start matching',
    category: 'strategy',
    link: '/matching',
    meta: { productCount: products.length },
  };
}

function draftCampaigns(campaigns) {
  const drafts = campaigns.filter((c) => c.status === 'DRAFT');
  if (drafts.length === 0) return null;

  const sample = drafts[0].title ? `"${drafts[0].title}"` : `${drafts.length} drafts`;

  return {
    id: 'campaign-drafts',
    title: `${drafts.length} draft campaign${drafts.length === 1 ? '' : 's'} not launched`,
    reason: `${sample} — complete and launch to start earning.`,
    confidence: computeConfidence({
      count: drafts.length,
      sampleSize: campaigns.length,
      urgency: 'normal',
    }),
    action: 'Review drafts',
    category: 'campaign',
    link: '/campaigns',
    meta: { count: drafts.length },
  };
}

module.exports = {
  campaignsNeedingApproval,
  campaignsWithoutDeliverables,
  noCampaignsYet,
  draftCampaigns,
};