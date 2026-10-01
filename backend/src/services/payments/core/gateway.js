// services/payments/core/gateway.js
/**
 * PaymentGateway — abstract contract.
 * Every concrete gateway (stripe, jazzcash, easypaisa, cod) extends this.
 * NOT all methods are required — capabilities() declares what's supported.
 */
class PaymentGateway {
  constructor(name, config) {
    this.name = name;
    this.config = config;
  }

  capabilities() {
    return { subscription: false, oneOff: false, payout: false, refund: false, webhook: false };
  }

  async createCheckout(_params) {
    throw new Error(`${this.name}.createCheckout() not implemented`);
  }

  verifySignature(_payload, _headers) {
    throw new Error(`${this.name}.verifySignature() not implemented`);
  }

  normalizeEvent(_payload) {
    throw new Error(`${this.name}.normalizeEvent() not implemented`);
  }

  async fetchStatus(_reference) { return null; }
  async refund(_reference, _amount) { return null; }
}

module.exports = { PaymentGateway };