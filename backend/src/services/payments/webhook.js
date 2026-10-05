// services/payments/webhook.js
const registry = require('./core/registry');
const handlers = require('./stripe/handlers');
const prisma = require('../../config/prisma');
const { enqueueWebhookRetry, QUEUE_ENABLED } = require('../queue');

const EVENT_ID_RE = /evt_[a-zA-Z0-9]+/;

/** Extract event ID from raw body (best-effort). */
function extractEventId(rawBody) {
  try {
    const obj = JSON.parse(rawBody.toString('utf8'));
    return EVENT_ID_RE.test(obj?.id) ? obj.id : null;
  } catch {
    return null;
  }
}

/** Stripe webhook dispatcher */
async function handleStripe(rawBody, signature) {
  const gw = registry.get('STRIPE');
  if (!gw.verifySignature(rawBody, signature)) {
    throw new Error('Stripe signature verification failed');
  }
  const event = gw.normalizeEvent(rawBody);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        return await handlers.checkoutCompleted.handle(event.data.object);
      case 'customer.subscription.updated':
        return await handlers.subscriptionUpdated.handle(event.data.object);
      case 'customer.subscription.deleted':
        return await handlers.subscriptionDeleted.handle(event.data.object);
      case 'invoice.paid':
      case 'invoice.payment_succeeded':
        return await handlers.invoicePaid.handle(event.data.object);
      case 'invoice.payment_failed':
        return await handlers.invoiceFailed.handle(event.data.object);
      default:
        return null;
    }
  } catch (err) {
    // Enqueue for retry if queue enabled
    if (QUEUE_ENABLED) {
      try {
        await enqueueWebhookRetry({
          eventId: event.id,
          eventType: event.type,
          object: event.data.object,
        });
        console.warn(
          `[webhook] handler failed for ${event.type} (${event.id}) — enqueued for retry`
        );
      } catch (qErr) {
        console.error('[webhook] failed to enqueue retry:', qErr.message);
      }
    }
    // Re-throw so the HTTP layer still returns 500 → Stripe will also retry
    throw err;
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