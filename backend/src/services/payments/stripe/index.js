// services/payments/stripe/index.js
const { PaymentGateway } = require('../core/gateway');
const config = require('../../../config/payment_service');
const client = require('./client');
const checkout = require('./checkout');
const customer = require('./customer');
const portal = require('./portal');
const subscription = require('./subscription');
const webhook = require('./webhook');

class StripeGateway extends PaymentGateway {
  constructor() {
    super('STRIPE', config.stripe);
    this.client = client;
  }

  capabilities() {
    return { subscription: true, oneOff: true, payout: false, refund: true, webhook: true };
  }

  createCheckout(params) {
    return params.mode === 'subscription'
      ? checkout.subscriptionCheckout(params)
      : checkout.oneOffCheckout(params);
  }

  verifySignature(rawBody, signature) {
    return webhook.verify(rawBody, signature);
  }

  normalizeEvent(rawBody) {
    return webhook.parse(rawBody);
  }

  fetchStatus(ref)      { return subscription.fetchStatus(ref); }
  refund(ref, amount)   { return this.client.refunds.create({ payment_intent: ref, amount }); }
  ensureCustomer(org)   { return customer.ensure(org); }
  createPortalSession(org, returnUrl) { return portal.create(org, returnUrl); }
  cancel(stripeSubId)   { return subscription.cancel(stripeSubId); }
  resume(stripeSubId)   { return subscription.resume(stripeSubId); }
}

module.exports = new StripeGateway();