// services/recommendations/signals/campaignSignals.js
// ======================================================
// Campaign-related recommendation signals
// ======================================================

/**
 * Campaigns with pending submissions needing brand approval
 */
function campaignsNeedingApproval(campaigns) {
  const needsApproval = campaigns.filter((c) =>
    c.deliverables?.some((d) =>
      d.submissions?.some((s) => s.status === 'PENDING')
    )
  );
  if (needsApproval.length === 0) return null;

  return {
    id: 'campaign-approval',
    title: `${needsApproval.length} campaign${needsApproval.length === 1 ? '' : 's'} awaiting your approval`,
    reason: 'Creators submitted content — review to keep campaigns moving.',
    confidence: 92,
    action: 'Open campaigns',
    category: 'campaign',
    link: '/campaigns',
    meta: { count: needsApproval.length, sampleId: needsApproval[0].id },
  };
}

/**
 * Campaigns with no deliverables yet
 */
function campaignsWithoutDeliverables(campaigns) {
  const empty = campaigns.filter(
    (c) => !c.deliverables || c.deliverables.length === 0
  );
  if (empty.length === 0) return null;

  return {
    id: 'campaign-empty',
    title: `${empty.length} campaign${empty.length === 1 ? '' : 's'} with no deliverables`,
    reason: 'Add influencers and create deliverables to launch your campaign.',
    confidence: 78,
    action: 'Review campaigns',
    category: 'campaign',
    link: '/campaigns',
    meta: { count: empty.length },
  };
}

/**
 * No campaigns at all — but brand has products → suggest launching first
 */
function noCampaignsYet(campaigns, products) {
  if (campaigns.length > 0 || products.length === 0) return null;

  return {
    id: 'first-campaign',
    title: 'Launch your first campaign',
    reason: `You have ${products.length} product${products.length === 1 ? '' : 's'} ready. Use AI matching to find the right creators.`,
    confidence: 88,
    action: 'Start matching',
    category: 'strategy',
    link: '/matching',
    meta: { productCount: products.length },
  };
}

/**
 * Draft campaigns that haven't been launched
 */
function draftCampaigns(campaigns) {
  const drafts = campaigns.filter((c) => c.status === 'DRAFT');
  if (drafts.length === 0) return null;

  return {
    id: 'campaign-drafts',
    title: `${drafts.length} draft campaign${drafts.length === 1 ? '' : 's'} not launched`,
    reason: 'Complete and launch your drafts to start earning.',
    confidence: 75,
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