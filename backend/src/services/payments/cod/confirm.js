// services/payments/cod/confirm.js
const prisma = require('../../../config/prisma');
const { PaymentError } = require('../core/errors');

async function confirmOrder(orderId, adminUserId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) throw new PaymentError('Order not found', 404, 'ORDER_NOT_FOUND');
    if (order.paymentStatus === 'SUCCEEDED') return order;

    return tx.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: 'COD',
        paymentStatus: 'SUCCEEDED',
        codConfirmedAt: new Date(),
        codConfirmedBy: adminUserId,
      },
    });
  });
}

module.exports = { confirmOrder };