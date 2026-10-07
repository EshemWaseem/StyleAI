// services/recommendations/signals/tips.js
// ======================================================
// Real-data-driven tips (no fake generic suggestions)
// Each tip requires actual state to fire.
// ======================================================

/**
 * Offer pending influencer decision for too long
 */
function stalePendingOffers(offers) {
  const stale = offers.filter((o) => {
    if (o.status !== 'PENDING') return false;
    const days = (Date.now() - new Date(o.createdAt).getTime()) / 86400000;
    return days > 3;
  });
  if (stale.length === 0) return null;

  return {
    id: 'stale-offers',
    title: `${stale.length} offer${stale.length === 1 ? '' : 's'} awaiting influencer reply`,
    reason: `${stale[0].influencerName || 'Some influencers'} haven't responded in 3+ days. Consider reaching out or cancelling.`,
    confidence: 88,
    action: 'Open offers',
    category: 'offer',
    link: '/offers',
    meta: { count: stale.length, sampleId: stale[0].id },
  };
}

/**
 * Low wallet balance (below typical offer amount)
 */
function lowWalletBalance(wallet) {
  if (!wallet) return null;
  const balance = Number(wallet.balanceCache || 0);
  if (balance >= 5000) return null;

  return {
    id: 'low-wallet',
    title: 'Wallet balance is low',
    reason: `Current balance: ${wallet.currency} ${balance.toFixed(2)}. Add funds to send new offers and keep campaigns running.`,
    confidence: 92,
    action: 'Add funds',
    category: 'finance',
    link: '/wallet',
    meta: { balance, currency: wallet.currency },
  };
}

/**
 * No saved/bookmarked influencers
 */
function noSavedInfluencers(savedCount) {
  if (savedCount > 0) return null;

  return {
    id: 'no-saved-influencers',
    title: 'Start building your influencer list',
    reason: 'Save creators you like so you can invite them to future campaigns quickly.',
    confidence: 70,
    action: 'Browse creators',
    category: 'strategy',
    link: '/influencers',
  };
}

/**
 * Only 1 product (need more for matching variety)
 */
function fewProducts(products) {
  if (products.length === 0 || products.length > 2) return null;

  return {
    id: 'few-products',
    title: 'Add more products',
    reason: `You have ${products.length} product${products.length === 1 ? '' : 's'}. More products = better AI matching.`,
    confidence: 75,
    action: 'Add product',
    category: 'product',
    link: '/products',
    meta: { count: products.length },
  };
}

module.exports = {
  stalePendingOffers,
  lowWalletBalance,
  noSavedInfluencers,
  fewProducts,
};