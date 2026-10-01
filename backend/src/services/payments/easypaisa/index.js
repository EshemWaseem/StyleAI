// services/payments/easypaisa/index.js
const { PaymentGateway } = require('../core/gateway');
const config = require('../../../config/payment_service');
const checkout = require('./checkout');
const callback = require('./callback');
const { verifyHash } = require('./hash');

class EasypaisaGateway extends PaymentGateway {
  constructor() { super('EASYPAISA', config.easypaisa); }

  capabilities() {
    return { subscription: true, oneOff: true, payout: true, refund: false, webhook: true };
  }

  createCheckout(params)   { return checkout.create(params); }
  verifySignature(payload) { return verifyHash(payload); }
  normalizeEvent(payload)  { return callback.handleReturn(payload); }
}

module.exports = new EasypaisaGateway();