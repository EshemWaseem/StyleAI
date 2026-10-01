// services/payments/checkout.js
const prisma = require('../../config/prisma');
const config = require('../../config/payment_service');
const registry = require('./core/registry');
const { PaymentError } = require('./core/errors');
const { getPlan } = require('../billing/plans');

async function createSubscriptionCheckout(user, {
  planName,
  cycle = 'MONTHLY',
  provider,
  successUrl,
  cancelUrl,
}) {
  if (!user.organizationId) throw new PaymentError('No organization linked', 403, 'NO_ORG');
  if (!config.isAllowed('SUBSCRIPTION', provider)) {
    throw new PaymentError(`Provider ${provider} not allowed for subscriptions`, 400, 'PROVIDER_NOT_ALLOWED');
  }

  const plan = getPlan(planName);
  if (!plan) throw new PaymentError('Unknown plan', 400, 'UNKNOWN_PLAN');
  if (plan.name === 'enterprise') {
    throw new PaymentError('Enterprise requires sales contact', 400, 'ENTERPRISE_ONLY');
  }

  const organization = await prisma.organization.findUnique({ where: { id: user.organizationId } });
  if (!organization) throw new PaymentError('Organization not found', 404, 'ORG_NOT_FOUND');

  const gateway = registry.get(provider);
  const amount = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;

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
    meta: { context: 'SUBSCRIPTION' },
  });

  await prisma.payment.create({
    data: {
      organizationId: user.organizationId,
      invoiceNumber: `PEND-${session.reference}`,
      amount,
      currency: plan.currency,
      status: 'PENDING',
      description: `${plan.label} (${cycle}) — ${provider}`,
      provider,
      context: 'SUBSCRIPTION',
      externalId: session.reference,
      metadata: { provider, cycle, planName },
    },
  });

  return session;
}

module.exports = { createSubscriptionCheckout };