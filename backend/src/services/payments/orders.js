// services/payments/orders.js
const prisma = require('../../config/prisma');
const config = require('../../config/payment_service');
const registry = require('./core/registry');
const { PaymentError } = require('./core/errors');

async function createOrderCheckout(user, { orderId, provider, successUrl, cancelUrl }) {
  if (!config.isAllowed('ORDER', provider)) {
    throw new PaymentError(`Provider ${provider} not allowed for orders`, 400, 'PROVIDER_NOT_ALLOWED');
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { user: true },
  });
  if (!order) throw new PaymentError('Order not found', 404, 'NOT_FOUND');

  const gateway = registry.get(provider);

  const session = await gateway.createCheckout({
    mode: 'payment',
    organization: order.user, // user as "customer" context for Stripe
    amount: Number(order.total),
    currency: 'usd',
    description: `Order ${order.orderNumber}`,
    orderId,
    successUrl,
    cancelUrl,
    meta: { context: 'ORDER', orderId },
  });

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentProvider: provider,
      paymentStatus: 'PENDING',
      paymentRef: session.reference,
    },
  });

  return session;
}

module.exports = { createOrderCheckout };