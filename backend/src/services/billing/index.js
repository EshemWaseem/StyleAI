// services/billing/index.js
// ======================================================
// Billing service — role-aware, trial-aware
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const {
  getPlanByFullName,
  listPlansForRole,
  getTrialPlanForRole,
  getDefaultPlanForRole,
} = require('./plans');
const {
  ensureSubscription,
  shapeSubscription,
  shapePayment,
  computeEffectiveState,
} = require('./helpers');
const { getBillingRole, getSubscriptionIdentity } = require('./roles');
const usage = require('./usage');

// ------------------------------------------------------
// Get my billing (role-aware)
// ------------------------------------------------------
async function getMyBilling(user) {
  const role = getBillingRole(user);
  if (!role) {
    // SUPER_ADMIN — no billing needed
    return {
      role: null,
      subscription: null,
      plan: null,
      usage: null,
      invoices: [],
      isAdmin: true,
    };
  }

  const identity = getSubscriptionIdentity(user, role);
  const sub = await ensureSubscription(identity);
  const plan = getPlanByFullName(`${role}:${sub.planName}`)
    || getPlanByFullName(sub.planName)
    || null;

  // Invoices belong to organizationId — only fetch for BRAND/AGENCY
  let payments = [];
  if (role !== 'INFLUENCER' && user.organizationId) {
    payments = await prisma.payment.findMany({
      where: { organizationId: user.organizationId, context: 'SUBSCRIPTION' },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  const usageData = await usage.read(sub);
  const shapedSub = shapeSubscription(sub);

  return {
    role,
    subscription: shapedSub,
    plan,
    usage: {
      used: usageData,
      limits: plan?.limits || {},
    },
    invoices: payments.map(shapePayment),
  };
}

// ------------------------------------------------------
// List plans for a role
// ------------------------------------------------------
function listPlans(role) {
  if (!role) {
    // Return all roles' plans
    return {
      BRAND: listPlansForRole('BRAND'),
      AGENCY: listPlansForRole('AGENCY'),
      INFLUENCER: listPlansForRole('INFLUENCER'),
    };
  }
  return listPlansForRole(role);
}

// ------------------------------------------------------
// Cancel (set cancelAtPeriodEnd)
// ------------------------------------------------------
async function cancelSubscription(user) {
  const role = getBillingRole(user);
  if (!role) throw httpError('Admin has no subscription', 400, 'NO_BILLING');

  const identity = getSubscriptionIdentity(user, role);
  const sub = await ensureSubscription(identity);

  if (sub.isTrial) {
    throw httpError('Cannot cancel a trial — it expires automatically', 400, 'TRIAL');
  }
  if (sub.planName === 'free') {
    throw httpError('Free plan cannot be cancelled', 400, 'FREE_PLAN');
  }

  if (sub.provider === 'STRIPE' && sub.stripeSubscriptionId) {
    try {
      const stripeGw = require('../payments/stripe');
      await stripeGw.cancel(sub.stripeSubscriptionId);
    } catch (e) {
      console.warn('[billing.cancel] Stripe cancel failed:', e.message);
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: true, cancelledAt: new Date() },
  });

  return shapeSubscription(updated);
}

async function resumeSubscription(user) {
  const role = getBillingRole(user);
  if (!role) throw httpError('Admin has no subscription', 400, 'NO_BILLING');

  const identity = getSubscriptionIdentity(user, role);
  const sub = await ensureSubscription(identity);

  if (sub.provider === 'STRIPE' && sub.stripeSubscriptionId) {
    try {
      const stripeGw = require('../payments/stripe');
      await stripeGw.resume(sub.stripeSubscriptionId);
    } catch (e) {
      console.warn('[billing.resume] Stripe resume failed:', e.message);
    }
  }

  const updated = await prisma.subscription.update({
    where: { id: sub.id },
    data: { cancelAtPeriodEnd: false, cancelledAt: null },
  });

  return shapeSubscription(updated);
}

// ------------------------------------------------------
// Get subscription for a user (used by middleware)
// ------------------------------------------------------
async function getSubscriptionForUser(user) {
  const role = getBillingRole(user);
  if (!role) return { role: null, subscription: null, plan: null };

  const identity = getSubscriptionIdentity(user, role);
  const sub = await ensureSubscription(identity);
  const plan = getPlanByFullName(`${role}:${sub.planName}`)
    || getPlanByFullName(sub.planName)
    || null;

  return { role, subscription: sub, plan };
}

module.exports = {
  getMyBilling,
  listPlans,
  cancelSubscription,
  resumeSubscription,
  getSubscriptionForUser,
  // re-exports for convenience
  getBillingRole,
  getTrialPlanForRole,
  getDefaultPlanForRole,
};