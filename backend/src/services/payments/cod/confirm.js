// services/payments/cod/confirm.js
const prisma = require('../../../config/prisma');
const { PaymentError } = require('../core/errors');
const walletSvc = require('../../wallet');

async function confirmOrder(orderId, adminUserId) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        payments: true,
        brand: { select: { id: true, organizationId: true } },   // ← brand needs org id
      },
    });

    if (!order) {
      throw new PaymentError('Order not found', 404, 'ORDER_NOT_FOUND');
    }

    if (['DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new PaymentError('Order is already delivered', 400, 'ALREADY_DELIVERED');
    }
    if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw new PaymentError(
        `Cannot confirm ${order.status.toLowerCase()} order`,
        400,
        'INVALID_ORDER_STATUS'
      );
    }

    const codPayment = (order.payments || []).find(
      (p) => p.provider === 'COD' && p.context === 'ORDER'
    );

    if (!codPayment) {
      throw new PaymentError('No COD payment found for this order', 400, 'NO_COD_PAYMENT');
    }
    if (codPayment.status === 'SUCCEEDED') {
      throw new PaymentError('Payment already confirmed', 400, 'ALREADY_PAID');
    }

    const now = new Date();

    const payment = await tx.payment.update({
      where: { id: codPayment.id },
      data: { status: 'SUCCEEDED', paidAt: now },
    });

    // Include brand so wallet flow can derive organizationId
    const updatedOrder = await tx.order.update({
      where: { id: orderId },
      data: { status: 'DELIVERED' },
      include: {
        items: true,
        brand: { select: { id: true, organizationId: true } },   // ← brand include
      },
    });

    let wallet;
    try {
      wallet = await walletSvc.creditOrderRevenue(tx, {
        order: updatedOrder,
        payment,
        actorUserId: adminUserId,
      });
    } catch (e) {
      console.error('[cod.confirm.wallet]', e.message);
      throw new PaymentError(
        `Wallet credit failed: ${e.message}`,
        500,
        'WALLET_CREDIT_FAILED'
      );
    }

    return { order: updatedOrder, payment, wallet };
  });
}

module.exports = { confirmOrder };