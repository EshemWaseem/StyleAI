// services/payments/checkout.js
// ======================================================
// Subscription checkout — role-aware (BRAND | AGENCY | INFLUENCER)
// ======================================================

const prisma = require('../../config/prisma');
const config = require('../../config/payment_service');
const registry = require('./core/registry');
const { PaymentError } = require('./core/errors');
const { getPlan } = require('../billing/plans');
const { getBillingRole, getSubscriptionIdentity } = require('../billing/roles');

async function createSubscriptionCheckout(user, {
  planName,
  cycle = 'MONTHLY',
  provider,
  successUrl,
  cancelUrl,
}) {
  // ---- Validate inputs ----
  if (!provider)  throw new PaymentError('Payment provider is required', 400, 'MISSING_PROVIDER');
  if (!planName)  throw new PaymentError('Plan name is required', 400, 'MISSING_PLAN');

  const role = getBillingRole(user);
  if (!role) throw new PaymentError('No billing role for this user', 403, 'NO_ROLE');

  if (!config.isAllowed('SUBSCRIPTION', provider)) {
    throw new PaymentError(
      `Provider ${provider} not allowed for subscriptions`,
      400, 'PROVIDER_NOT_ALLOWED'
    );
  }

  // ---- Look up the plan (role-aware) ----
  const plan = getPlan(role, planName);
  if (!plan) {
    throw new PaymentError(`Unknown plan "${planName}" for role ${role}`, 400, 'UNKNOWN_PLAN');
  }
  if (plan.isTrial) {
    throw new PaymentError('Trial plan cannot be purchased', 400, 'TRIAL_PLAN');
  }
  if (plan.priceMonthly === null || plan.priceMonthly === undefined) {
    throw new PaymentError('This plan requires contacting sales', 400, 'CONTACT_SALES');
  }

  const amount = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  if (!amount || amount <= 0) {
    throw new PaymentError('Invalid plan amount', 400, 'INVALID_AMOUNT');
  }

  // ---- Identity ----
  const identity = getSubscriptionIdentity(user, role);

  // For BRAND/AGENCY → load organization
  let organization = null;
  if (identity.organizationId) {
    organization = await prisma.organization.findUnique({
      where: { id: identity.organizationId },
    });
    if (!organization) throw new PaymentError('Organization not found', 404, 'ORG_NOT_FOUND');
  }

  // ---- Get gateway + create checkout session ----
  const gateway = registry.get(provider);

  const session = await gateway.createCheckout({
    mode: 'subscription',
    organization,
    plan,
    cycle,
    amount,
    currency: plan.currency,
    description: `${plan.label} — ${cycle}`,
    successUrl,
    cancelUrl,
    meta: { context: 'SUBSCRIPTION', planName: plan.name, role },
  });

  // ---- Persist intent (audit) ----
  // Note: Payment.organizationId is nullable now; for influencers we skip it
  await prisma.payment.create({
    data: {
      organizationId: identity.organizationId || null,
      invoiceNumber: `PEND-${session.reference}`,
      amount,
      currency: plan.currency,
      status: 'PENDING',
      description: `${plan.label} (${cycle}) — ${provider}`,
      provider,
      context: 'SUBSCRIPTION',
      externalId: session.reference,
      metadata: { provider, cycle, planName: plan.name, role },
    },
  });

  return session;
}

module.exports = { createSubscriptionCheckout };