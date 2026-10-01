// middleware/quotaCheck.js
// ======================================================
// Quota enforcement for AI + feature usage
// ======================================================

const svc = require('../services/billing');
const usage = require('../services/billing/usage');

/**
 * Factory — creates a middleware that checks a specific quota field.
 *
 * Usage:
 *   router.post('/ai/text', authenticate, quotaCheck('aiTextPerMonth', 'aiTextCalls'), handler)
 *
 * @param {string} limitKey  - key in plan.limits (e.g., 'aiTextPerMonth')
 * @param {string} counterKey - key in usage counter (e.g., 'aiTextCalls')
 */
function quotaCheck(limitKey, counterKey) {
  return async function (req, res, next) {
    try {
      if (!req.user) return res.status(401).json({ message: 'Not authenticated' });

      // SUPER_ADMIN bypass
      if (req.user.roles?.includes('SUPER_ADMIN')) {
        return next();
      }

      const { role, subscription, plan } = await svc.getSubscriptionForUser(req.user);
      if (!role || !plan) {
        return res.status(403).json({ message: 'No billing plan found', code: 'NO_PLAN' });
      }

      const limit = plan.limits?.[limitKey];
      // null/undefined limit → unlimited
      if (limit === null || limit === undefined) {
        req.billing = { role, subscription, plan, remaining: null };
        return next();
      }

      const used = await usage.read(subscription);
      const consumed = used[counterKey] || 0;

      if (consumed >= limit) {
        return res.status(402).json({
          message: `You've reached your monthly limit for this feature (${consumed}/${limit}). Upgrade to continue.`,
          code: 'QUOTA_EXCEEDED',
          limitKey,
          limit,
          used: consumed,
          role,
          planName: subscription.planName,
        });
      }

      // Attach for downstream increment
      req.billing = {
        role,
        subscription,
        plan,
        limitKey,
        counterKey,
        limit,
        used: consumed,
        remaining: limit - consumed,
      };
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Increment usage after successful action.
 * Attach to route handler after the AI call succeeds:
 *
 *   router.post('/ai/text', quotaCheck(...), asyncHandler, incrementUsage);
 */
async function incrementUsage(req, res, next) {
  // Fire-and-forget — don't block the response
  if (req.billing?.subscription && req.billing?.counterKey) {
    usage
      .increment(req.billing.subscription, req.billing.counterKey, 1)
      .catch((e) => console.warn('[quotaCheck.increment] failed:', e.message));
  }
  next();
}

module.exports = { quotaCheck, incrementUsage };