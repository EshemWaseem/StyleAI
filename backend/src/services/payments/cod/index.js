// services/payments/cod/index.js
const { PaymentGateway } = require('../core/gateway');
const config = require('../../../config/payment_service');
const { confirmOrder } = require('./confirm');

class CodGateway extends PaymentGateway {
  constructor() { super('COD', config.cod); }

  capabilities() {
    return { subscription: false, oneOff: true, payout: false, refund: false, webhook: false };
  }

  async createCheckout({ orderId }) {
    return {
      url: null,
      method: 'NONE',
      reference: `COD-${orderId}`,
      instructions: 'Pay in cash when your order is delivered.',
    };
  }

  verifySignature() { return true; }
  normalizeEvent() { return null; }

  async confirm(orderId, adminUserId) { return confirmOrder(orderId, adminUserId); }
}

module.exports = new CodGateway();