// services/payments/stripe/client.js
const Stripe = require('stripe');
const config = require('../../../config/payment_service');

let client = null;
if (config.stripe.enabled) {
  client = new Stripe(config.stripe.secretKey, { apiVersion: config.stripe.apiVersion });
}

module.exports = client;