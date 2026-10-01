// services/payments/stripe/handlers/checkoutCompleted.js
const prisma = require('../../../../config/prisma');
const { getPlan } = require('../../../billing/plans');

async function handle(session) {
  const organizationId = session.metadata?.organizationId;

  // --- Subscription checkout ---
  if (session.mode === 'subscription' && organizationId) {
    const planName = session.metadata.planName;
    const plan = getPlan(planName);
    if (!plan) return;

    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { organizationId },
        data: {
          planName,
          status: 'ACTIVE',
          provider: 'STRIPE',
          stripeSubscriptionId: session.subscription,
          stripeStatus: 'active',
          cancelAtPeriodEnd: false,
          cancelledAt: null,
        },
      });

      await tx.payment.upsert({
        where: { invoiceNumber: `ST-${session.id}` },
        update: { status: 'SUCCEEDED', paidAt: new Date() },
        create: {
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
    });
  }

  // --- One-off / order checkout ---
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