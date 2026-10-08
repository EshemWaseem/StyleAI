// services/recommendations/signals/offerSignals.js
// ======================================================
// Offer signals — enriched, dynamic confidence
// ======================================================

const { computeConfidence } = require('../confidence');

function offersPending(offers) {
  const pending = offers.filter((o) => o.status === 'PENDING');
  if (pending.length === 0) return null;

  const oldestDays = Math.max(
    ...pending.map((o) => (Date.now() - new Date(o.createdAt).getTime()) / 86400000)
  );
  const sample = pending[0].influencerName;

  return {
    id: 'offers-pending',
    title: `${pending.length} offer${pending.length === 1 ? '' : 's'} awaiting influencer`,
    reason: sample
      ? `${sample}${pending.length > 1 ? ` and ${pending.length - 1} more` : ''} haven't responded${oldestDays >= 1 ? ` (oldest: ${Math.floor(oldestDays)}d)` : ''}. Follow up or send new offers.`
      : `Influencers haven't accepted your offers yet. Follow up or send new ones.`,
    confidence: computeConfidence({
      count: pending.length,
      ageDays: oldestDays,
      urgency: oldestDays > 3 ? 'high' : 'normal',
    }),
    action: 'Open offers',
    category: 'offer',
    link: '/offers',
    meta: { count: pending.length },
  };
}

function offersInProgress(offers) {
  const active = offers.filter((o) => o.status === 'IN_PROGRESS');
  if (active.length === 0) return null;

  return {
    id: 'offers-active',
    title: `${active.length} offer${active.length === 1 ? '' : 's'} in progress`,
    reason: 'Influencers are working on content. Track their campaign deliverables.',
    confidence: computeConfidence({
      count: active.length,
      urgency: 'normal',
    }),
    action: 'Open campaigns',
    category: 'offer',
    link: '/campaigns',
    meta: { count: active.length },
  };
}

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
    confidence: computeConfidence({
      count: recent.length,
      urgency: 'low',
    }),
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