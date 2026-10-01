// services/payments/stripe/webhook.js
const stripe = require('./client');
const config = require('../../../config/payment_service');

function verify(rawBody, signature) {
  try {
    stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
    return true;
  } catch {
    return false;
  }
}

function parse(rawBody) {
  return JSON.parse(rawBody.toString('utf8'));
}

module.exports = { verify, parse };