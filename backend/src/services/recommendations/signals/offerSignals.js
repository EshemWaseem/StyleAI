// services/recommendations/signals/offerSignals.js
// ======================================================
// Offer-related real-data signals
// ======================================================

/**
 * Offers pending influencer decision (any age)
 */
function offersPending(offers) {
  const pending = offers.filter((o) => o.status === 'PENDING');
  if (pending.length === 0) return null;

  return {
    id: 'offers-pending',
    title: `${pending.length} offer${pending.length === 1 ? '' : 's'} awaiting influencer`,
    reason: `Influencers haven't accepted your offers yet. Follow up or send new ones.`,
    confidence: 85,
    action: 'Open offers',
    category: 'offer',
    link: '/offers',
    meta: { count: pending.length },
  };
}

/**
 * Offers in progress (content being produced)
 */
function offersInProgress(offers) {
  const active = offers.filter((o) => o.status === 'IN_PROGRESS');
  if (active.length === 0) return null;

  return {
    id: 'offers-active',
    title: `${active.length} offer${active.length === 1 ? '' : 's'} in progress`,
    reason: 'Influencers are working on content. Track their campaign deliverables.',
    confidence: 60,
    action: 'Open campaigns',
    category: 'offer',
    link: '/campaigns',
    meta: { count: active.length },
  };
}

/**
 * Recently completed offers (celebratory / suggestions)
 */
function offersRecentlyCompleted(offers) {
  const recent = offers.filter((o) => {
    if (o.status !== 'COMPLETED') return false;
    const days = (Date.now() - new Date(o.updatedAt).getTime()) / 86400000;
    return days <= 7;
  });
  if (recent.length === 0) return null;

  return {
    id: 'offers-completed-recent',
    title: `${recent.length} campaign${recent.length === 1 ? '' : 's'} completed recently 🎉`,
    reason: 'Great work! Review analytics and consider a follow-up campaign with the same creators.',
    confidence: 80,
    action: 'View analytics',
    category: 'analytics',
    link: '/analytics',
    meta: { count: recent.length },
  };
}

module.exports = {
  offersPending,
  offersInProgress,
  offersRecentlyCompleted,
};