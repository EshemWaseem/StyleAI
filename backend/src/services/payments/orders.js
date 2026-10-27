// services/payments/orders.js
const prisma = require('../../config/prisma');
const config = require('../../config/payment_service');
const registry = require('./core/registry');
const { PaymentError } = require('./core/errors');

async function createOrderCheckout(user, { orderId, provider, successUrl, cancelUrl }) {
  if (!config.isAllowed('ORDER', provider)) {
    throw new PaymentError(
      `Provider ${provider} not allowed for orders`,
      400,
      'PROVIDER_NOT_ALLOWED'
    );
  }

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      payments: true,
      brand: { select: { id: true, organizationId: true } },
    },
  });

  if (!order) {
    throw new PaymentError('Order not found', 404, 'NOT_FOUND');
  }

  const isOwner = order.userId === user.id;
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (!isOwner && !isAdmin) {
    throw new PaymentError('Forbidden', 403, 'FORBIDDEN');
  }

  const gateway = registry.get(provider);
  const amount = Number(order.total);   // schema: Order.total

  const session = await gateway.createCheckout({
    mode: 'payment',
    user,
    order,
    orderId: order.id,
    amount,
    currency: order.currency,
    description: `Order #${order.id.slice(0, 8)}`,
    successUrl,
    cancelUrl,
    meta: { context: 'ORDER', orderId: order.id },
  });

  return {
    ...session,
    orderId: order.id,
    amount,
    currency: order.currency,
  };
}

module.exports = { createOrderCheckout };