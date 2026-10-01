// services/payments/jazzcash/index.js
const { PaymentGateway } = require('../core/gateway');
const config = require('../../../config/payment_service');
const checkout = require('./checkout');
const callback = require('./callback');
const { verifyHash } = require('./hash');

class JazzCashGateway extends PaymentGateway {
  constructor() { super('JAZZCASH', config.jazzcash); }

  capabilities() {
    return { subscription: true, oneOff: true, payout: true, refund: false, webhook: true };
  }

  createCheckout(params)   { return checkout.create(params); }
  verifySignature(payload) { return verifyHash(payload); }
  normalizeEvent(payload)  { return callback.handleReturn(payload); }
}

module.exports = new JazzCashGateway();