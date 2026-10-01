// services/billing/index.js
// ======================================================
// Billing service — plans, subscription, invoices
// (upgradePlan REMOVED — checkout handled by payments module)
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { PLANS, getPlan, listPlans } = require('./plans');
const {
  ensureSubscription,
  shapeSubscription,
  shapePayment,
} = require('./helpers');

async function getMyBilling(user) {
  if (!user.organizationId) {
    throw httpError('No organization linked', 403, 'NO_ORG');
  }

  const sub = await ensureSubscription(user.organizationId);
  const plan = getPlan(sub.planName) || PLANS.free;

  const payments = await prisma.payment.findMany({
    where: {
      organizationId: user.organizationId,
      context: 'SUBSCRIPTION',
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  return {
    subscription: shapeSubscription(sub),
    plan,
    invoices: payments.map(shapePayment),
  };
}

async function cancelSubscription(user) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
  const sub = await ensureSubscription(user.organizationId);

  if (sub.planName === 'free') {
    throw httpError('Free plan cannot be cancelled', 400, 'FREE_PLAN');
  }

  // If Stripe is the active provider, also cancel at Stripe side
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
    data: {
      cancelAtPeriodEnd: true,
      cancelledAt: new Date(),
    },
  });

  return shapeSubscription(updated);
}

async function resumeSubscription(user) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
  const sub = await ensureSubscription(user.organizationId);

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

module.exports = {
  listPlans,
  getMyBilling,
  cancelSubscription,
  resumeSubscription,
};