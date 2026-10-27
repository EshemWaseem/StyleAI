// backend/src/controllers/adminOrderController.js
const prisma = require('../config/prisma');
const codGateway = require('../services/payments/cod');
const { httpError } = require('../services/influencer/helpers');
const { writeAudit } = require('../services/admin/helpers');
const { notifyUser } = require('../services/notifications');

async function listOrders(req, res, next) {
  try {
    const { status, provider, search, limit = 100 } = req.query;
    const where = {};
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 200),
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        items: true,
        payments: true,
      },
    });

    let result = orders.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: Number(o.totalAmount),
      currency: o.currency,
      createdAt: o.createdAt,
      user: o.user,
      organization: o.organization,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.name,
        quantity: i.quantity,
        priceAtTime: Number(i.priceAtTime),
      })),
      payments: (o.payments || []).map((p) => ({
        id: p.id,
        invoiceNumber: p.invoiceNumber,
        amount: Number(p.amount),
        currency: p.currency,
        status: p.status,
        provider: p.provider,
        paidAt: p.paidAt,
        context: p.context,
      })),
    }));

    if (provider) {
      result = result.filter((o) => o.payments.some((p) => p.provider === provider));
    }

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          o.user?.name?.toLowerCase().includes(q) ||
          o.user?.email?.toLowerCase().includes(q)
      );
    }

    res.json({ count: result.length, orders: result });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true, slug: true } },
        items: true,
        payments: true,
      },
    });
    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');
    res.json({ order });
  } catch (err) {
    next(err);
  }
}

async function confirmDelivery(req, res, next) {
  try {
    const { orderId } = req.params;
    const result = await codGateway.confirm(orderId, req.user.id);

    await writeAudit({
      actorId: req.user.id,
      action: 'order.confirm_delivery',
      targetType: 'Order',
      targetId: orderId,
      meta: { paymentId: result.payment.id },
      ipAddress: req.ip,
    });

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { user: { select: { id: true } } },
    });

    if (order?.userId) {
      notifyUser(order.userId, {
        type: 'SYSTEM',
        title: 'Your order has been delivered',
        body: `Order #${order.id.slice(0, 8).toUpperCase()} marked as delivered. Thank you for shopping with StyleAI!`,
        link: `/orders/${order.id}`,
        meta: { event: 'ORDER_DELIVERED', orderId: order.id },
      }).catch(() => {});
    }

    res.json({
      message: 'Order marked as delivered and payment confirmed',
      order: result.order,
      payment: result.payment,
    });
  } catch (err) {
    next(err);
  }
}

async function cancelOrder(req, res, next) {
  try {
    const { orderId } = req.params;
    const { reason } = req.body || {};

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');
    if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw httpError(`Cannot cancel order in status ${order.status}`, 400, 'INVALID_STATUS');
    }

    const pendingPayments = (order.payments || []).filter(
      (p) => p.status === 'PENDING' && p.context === 'ORDER'
    );

    await prisma.$transaction([
      prisma.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      }),
      prisma.payment.updateMany({
        where: { orderId, status: 'PENDING', context: 'ORDER' },
        data: { status: 'FAILED', description: reason ? `Cancelled: ${reason}` : 'Cancelled' },
      }),
    ]);

    await writeAudit({
      actorId: req.user.id,
      action: 'order.cancel',
      targetType: 'Order',
      targetId: orderId,
      meta: { reason: reason || null, cancelledPayments: pendingPayments.length },
      ipAddress: req.ip,
    });

    res.json({ message: 'Order cancelled', orderId });
  } catch (err) {
    next(err);
  }
}

module.exports = { listOrders, getOrder, confirmDelivery, cancelOrder };