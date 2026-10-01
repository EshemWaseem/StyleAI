// services/payments/stripe/refund.js
const stripe = require('./client');

async function full(paymentIntentId) {
  return stripe.refunds.create({ payment_intent: paymentIntentId });
}

async function partial(paymentIntentId, amountCents) {
  return stripe.refunds.create({ payment_intent: paymentIntentId, amount: amountCents });
}

module.exports = { full, partial };