// services/payments/core/idempotency.js
const prisma = require('../../../config/prisma');

/**
 * Prevent duplicate processing of gateway events.
 * Stripe: session.id
 * JazzCash: pp_TxnRefNo
 * Easypaisa: orderRefNum
 */
async function claim({ provider, externalId, context }) {
  const existing = await prisma.payment.findFirst({
    where: { provider, externalId, context },
    select: { id: true },
  });
  return !existing; // true = we own it, safe to process
}

module.exports = { claim };