// middleware/trialCheck.js
// ======================================================
// Trial enforcement middleware
// - Blocks brands/agencies with expired trials
// - Allows influencers on free tier (with limited features)
// - SUPER_ADMIN bypasses everything
// ======================================================

const svc = require('../services/billing');
const { computeEffectiveState } = require('../services/billing/helpers');

/**
 * Attach to any route that requires an active paid subscription.
 * For influencers on free tier, marks `req.billing.grandfathered = true`.
 */
async function requireActiveSubscription(req, res, next) {
  try {
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

    // SUPER_ADMIN bypass
    if (req.user.roles?.includes('SUPER_ADMIN')) {
      req.billing = { admin: true, allowed: true };
      return next();
    }

    const { role, subscription, plan } = await svc.getSubscriptionForUser(req.user);

    if (!role) {
      return res.status(403).json({ message: 'No billing role assigned', code: 'NO_ROLE' });
    }

    const state = computeEffectiveState(subscription);
    req.billing = { role, subscription, plan, state };

    // Trial expired → block with upgrade prompt
    if (state === 'trial_expired') {
      return res.status(402).json({
        message: 'Your free trial has expired. Please upgrade to continue.',
        code: 'TRIAL_EXPIRED',
        role,
      });
    }

    // Past due / cancelled / expired paid plan → block
    if (state === 'past_due' || state === 'expired') {
      return res.status(402).json({
        message: 'Your subscription is inactive. Please renew to continue.',
        code: 'SUBSCRIPTION_INACTIVE',
        state,
        role,
      });
    }

    // Influencer on free tier → allowed but flagged
    if (role === 'INFLUENCER' && subscription.planName === 'free') {
      req.billing.freeTier = true;
    }

    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { requireActiveSubscription };