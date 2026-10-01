// services/billing/helpers.js
// ======================================================
// Billing helpers — role-aware subscription management
// ======================================================

const prisma = require('../../config/prisma');
const { getTrialPlanForRole, getDefaultPlanForRole } = require('./plans');

function generateInvoiceNumber() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${ym}-${rand}`;
}

/**
 * Ensure a subscription exists for the given user/org + role.
 * Creates a trial (brands/agencies) or free (influencers) subscription on first use.
 *
 * @param {Object} opts
 * @param {string} opts.role       - 'BRAND' | 'AGENCY' | 'INFLUENCER'
 * @param {string} [opts.organizationId] - required for BRAND/AGENCY
 * @param {string} [opts.userId]         - required for INFLUENCER
 */
async function ensureSubscription({ role, organizationId, userId }) {
  if (!role) throw new Error('role is required');

  // Find existing
  let sub = null;
  if (role === 'INFLUENCER') {
    if (!userId) throw new Error('userId required for INFLUENCER');
    sub = await prisma.subscription.findUnique({ where: { userId } });
  } else {
    if (!organizationId) throw new Error('organizationId required for BRAND/AGENCY');
    sub = await prisma.subscription.findUnique({ where: { organizationId } });
  }
  if (sub) return sub;

  // Create new — start with trial (or free for influencers)
  const trialPlan = getTrialPlanForRole(role);
  const defaultPlan = getDefaultPlanForRole(role);

  const isTrial = !!trialPlan;
  const planName = isTrial ? trialPlan.name : defaultPlan?.name || 'free';

  const trialEndsAt = isTrial
    ? new Date(Date.now() + trialPlan.trialDays * 24 * 60 * 60 * 1000)
    : null;

  sub = await prisma.subscription.create({
    data: {
      organizationId: role === 'INFLUENCER' ? null : organizationId,
      userId: role === 'INFLUENCER' ? userId : null,
      role,
      planName,
      status: 'ACTIVE',
      isTrial,
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    },
  });
  return sub;
}

/**
 * Determine the "effective" state of a subscription:
 *  - 'active'          — paid plan, within period
 *  - 'trial'           — trial, days remaining > 0
 *  - 'trial_expired'   — trial ended, must upgrade
 *  - 'past_due'        — payment failed
 *  - 'cancelled'       — cancelled at period end
 */
function computeEffectiveState(sub) {
  if (!sub) return 'none';
  if (sub.status === 'PAST_DUE') return 'past_due';
  if (sub.status === 'CANCELLED' || sub.status === 'EXPIRED') return 'cancelled';

  if (sub.isTrial) {
    if (!sub.trialEndsAt) return 'trial';
    return new Date() < new Date(sub.trialEndsAt) ? 'trial' : 'trial_expired';
  }

  if (sub.currentPeriodEnd && new Date() > new Date(sub.currentPeriodEnd)) {
    return 'expired';
  }

  return 'active';
}

function shapeSubscription(s) {
  const state = computeEffectiveState(s);
  const trialDaysLeft = s.isTrial && s.trialEndsAt
    ? Math.max(0, Math.ceil((new Date(s.trialEndsAt) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return {
    id: s.id,
    role: s.role,
    planName: s.planName,
    status: s.status,
    effectiveState: state,
    isTrial: s.isTrial,
    trialEndsAt: s.trialEndsAt,
    trialDaysLeft,
    currency: s.currency,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    cancelledAt: s.cancelledAt,
    createdAt: s.createdAt,
  };
}

function shapePayment(p) {
  return {
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    description: p.description,
    paidAt: p.paidAt,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    createdAt: p.createdAt,
  };
}

module.exports = {
  generateInvoiceNumber,
  ensureSubscription,
  computeEffectiveState,
  shapeSubscription,
  shapePayment,
};