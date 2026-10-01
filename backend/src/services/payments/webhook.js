// services/payments/webhook.js
const registry = require('./core/registry');
const handlers = require('./stripe/handlers');
const prisma = require('../../config/prisma');

/** Stripe webhook dispatcher */
async function handleStripe(rawBody, signature) {
  const gw = registry.get('STRIPE');
  if (!gw.verifySignature(rawBody, signature)) {
    throw new Error('Stripe signature verification failed');
  }
  const event = gw.normalizeEvent(rawBody);

  switch (event.type) {
    case 'checkout.session.completed':
      return handlers.checkoutCompleted.handle(event.data.object);
    case 'customer.subscription.updated':
      return handlers.subscriptionUpdated.handle(event.data.object);
    case 'customer.subscription.deleted':
      return handlers.subscriptionDeleted.handle(event.data.object);
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      return handlers.invoicePaid.handle(event.data.object);
    case 'invoice.payment_failed':
      return handlers.invoiceFailed.handle(event.data.object);
    default:
      return null;
  }
}

/** JazzCash / Easypaisa unified callback */
async function handleWalletReturn(provider, payload) {
  const gw = registry.get(provider);
  const normalized = await gw.normalizeEvent(payload);

  if (normalized.context === 'SUBSCRIPTION' && normalized.organizationId) {
    await prisma.payment.updateMany({
      where: { externalId: normalized.reference, provider },
      data: {
        status: normalized.status,
        paidAt: normalized.status === 'SUCCEEDED' ? new Date() : null,
        metadata: normalized.raw,
      },
    });
  }

  if (normalized.context === 'ORDER') {
    await prisma.order.updateMany({
      where: { paymentRef: normalized.reference },
      data: {
        paymentStatus: normalized.status,
      },
    });
  }

  return normalized;
}

module.exports = { handleStripe, handleWalletReturn };