// services/payments/stripe/handlers/checkoutCompleted.js
const prisma = require('../../../../config/prisma');
const { getPlanByFullName } = require('../../../billing/plans');

async function handle(session) {
  const organizationId = session.metadata?.organizationId;
  if (!organizationId) {
    console.warn('[stripe.checkoutCompleted] missing organizationId in metadata');
    return;
  }

  // =====================================================
  // SUBSCRIPTION
  // =====================================================
  if (session.mode === 'subscription') {
    const planName = session.metadata.planName;
    const role = session.metadata.role || 'BRAND';
    const cycle = session.metadata.cycle || 'MONTHLY';

    const plan = getPlanByFullName(`${role}:${planName}`);
    if (!plan) {
      console.warn(`[stripe.checkoutCompleted] plan not found: ${role}:${planName}`);
      return;
    }

    await prisma.$transaction(async (tx) => {
      // 1. Upgrade subscription
      await tx.subscription.update({
        where: { organizationId },
        data: {
          planName,
          status: 'ACTIVE',
          provider: 'STRIPE',
          billingCycle: cycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
          stripeSubscriptionId: session.subscription,
          stripeStatus: 'active',
          stripeCustomerId: session.customer,
          isTrial: false,
          trialEndsAt: null,
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });

      // 2. Find the pending payment by externalId and update it
      const pending = await tx.payment.findFirst({
        where: {
          externalId: session.id,
          status: 'PENDING',
        },
      });

      if (pending) {
        // Update the existing pending payment
        await tx.payment.update({
          where: { id: pending.id },
          data: {
            status: 'SUCCEEDED',
            paidAt: new Date(),
            stripePaymentIntentId: session.payment_intent || null,
            metadata: { provider: 'STRIPE', cycle, planName, role, stripeSessionId: session.id },
          },
        });
      } else {
        // No pending found — create fresh
        await tx.payment.create({
          data: {
            organizationId,
            invoiceNumber: `ST-${session.id}`,
            amount: (session.amount_total || 0) / 100,
            currency: (session.currency || 'usd').toUpperCase(),
            status: 'SUCCEEDED',
            description: `Stripe subscription — ${plan.label}`,
            provider: 'STRIPE',
            context: 'SUBSCRIPTION',
            externalId: session.id,
            stripePaymentIntentId: session.payment_intent || null,
            paidAt: new Date(),
          },
        });
      }
    });

    console.log(`[stripe.checkoutCompleted] upgraded ${organizationId} → ${role}:${planName}`);
  }

  // =====================================================
  // ONE-OFF (order payment)
  // =====================================================
  if (session.mode === 'payment') {
    const orderId = session.metadata?.orderId;
    if (!orderId) return;

    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: 'STRIPE',
        paymentStatus: 'SUCCEEDED',
        paymentRef: session.payment_intent || session.id,
      },
    });
  }
}

module.exports = { handle };