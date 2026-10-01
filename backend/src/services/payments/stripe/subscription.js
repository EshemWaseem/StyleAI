// services/payments/stripe/subscription.js
const stripe = require('./client');

const cancel = (id) => stripe.subscriptions.update(id, { cancel_at_period_end: true });
const resume = (id) => stripe.subscriptions.update(id, { cancel_at_period_end: false });
const fetchStatus = (id) => stripe.subscriptions.retrieve(id);

module.exports = { cancel, resume, fetchStatus };