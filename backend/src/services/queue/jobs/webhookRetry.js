// services/queue/jobs/webhookRetry.js
// ======================================================
// Retry a failed Stripe webhook event.
// Payload: { eventId, eventType, object }
// ======================================================
const handlers = require('../../payments/stripe/handlers');

async function processWebhookRetry(job) {
  const { eventId, eventType, object } = job.data;
  console.log(`[queue.webhook] retrying ${eventType} (${eventId}) attempt=${job.attemptsMade + 1}`);

  switch (eventType) {
    case 'checkout.session.completed':
      return handlers.checkoutCompleted.handle(object);
    case 'customer.subscription.updated':
      return handlers.subscriptionUpdated.handle(object);
    case 'customer.subscription.deleted':
      return handlers.subscriptionDeleted.handle(object);
    case 'invoice.paid':
    case 'invoice.payment_succeeded':
      return handlers.invoicePaid.handle(object);
    case 'invoice.payment_failed':
      return handlers.invoiceFailed.handle(object);
    default:
      console.warn(`[queue.webhook] no handler for ${eventType}`);
      return null;
  }
}

module.exports = { processWebhookRetry };