// services/payments/cod/index.js
const { PaymentGateway } = require('../core/gateway');
const prisma = require('../../../config/prisma');
const config = require('../../../config/payment_service');
const { httpError } = require('../../influencer/helpers');
const { confirmOrder } = require('./confirm');

class CodGateway extends PaymentGateway {
  constructor() {
    super('COD', config.cod);
  }

  capabilities() {
    return {
      subscription: false,
      oneOff: true,
      payout: false,
      refund: false,
      webhook: false,
    };
  }

  async createCheckout({ orderId, order }) {
    if (!this.config.enabled) {
      throw httpError('Cash on Delivery is currently disabled', 400, 'COD_DISABLED');
    }

    const ord =
      order ||
      (await prisma.order.findUnique({
        where: { id: orderId },
        include: { brand: { select: { id: true, organizationId: true } } },
      }));

    if (!ord) {
      throw httpError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    const amount = Number(ord.total);   // schema: Order.total (not totalAmount)
    const currency = ord.currency || this.config.currency;

    if (amount < this.config.minOrderAmount) {
      throw httpError(
        `Minimum order for COD is ${currency} ${this.config.minOrderAmount}`,
        400,
        'COD_BELOW_MIN'
      );
    }
    if (amount > this.config.maxOrderAmount) {
      throw httpError(
        `Maximum order for COD is ${currency} ${this.config.maxOrderAmount}`,
        400,
        'COD_ABOVE_MAX'
      );
    }

    // Idempotent: reuse existing COD payment
    const existing = await prisma.payment.findFirst({
      where: {
        order: { id: ord.id },     // relation filter — works regardless of scalar type
        provider: 'COD',
        context: 'ORDER',
      },
    });

    if (existing) {
      return {
        url: null,
        method: 'NONE',
        reference: existing.invoiceNumber,
        paymentId: existing.id,
        instructions: 'Pay in cash when your order is delivered.',
      };
    }

    const invoiceNumber = `INV-COD-${Date.now()}-${Math.floor(
      Math.random() * 9000 + 1000
    )}`;

    // Derive org from brand (Order schema has no organizationId)
    const organizationId = ord.brand?.organizationId || null;

    const payment = await prisma.payment.create({
      data: {
        invoiceNumber,
        amount,
        currency,
        status: 'PENDING',
        provider: 'COD',
        context: 'ORDER',
        description: `Cash on Delivery for Order #${ord.id.slice(0, 8)}`,
        // Nested relations only — avoids scalar/checked input mismatch
        order: { connect: { id: ord.id } },
        ...(organizationId
          ? { organization: { connect: { id: organizationId } } }
          : {}),
      },
    });

    return {
      url: null,
      method: 'NONE',
      reference: invoiceNumber,
      paymentId: payment.id,
      instructions: 'Pay in cash when your order is delivered.',
    };
  }

  verifySignature() {
    return true;
  }

  normalizeEvent() {
    return null;
  }

  async confirm(orderId, adminUserId) {
    return confirmOrder(orderId, adminUserId);
  }
}

module.exports = new CodGateway();