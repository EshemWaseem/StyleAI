// backend/src/controllers/adminOrderController.js
const prisma = require('../config/prisma');
const codGateway = require('../services/payments/cod');
const { httpError } = require('../services/influencer/helpers');
const { writeAudit } = require('../services/admin/helpers');
const { notifyUser } = require('../services/notifications');

/**
 * Shape a single Order for the admin API.
 * Provides BOTH schema-native names AND frontend-friendly aliases
 * so existing frontend code keeps working without changes.
 *
 * Schema facts:
 *  - Order.total (not totalAmount)
 *  - Order.brandId → Brand.organizationId → Organization
 *  - Order has `brand` relation, NOT `organization`
 *  - OrderItem.unitPrice (not priceAtTime), no `name` field
 */
function shapeOrder(o) {
  return {
    id: o.id,
    orderNumber: o.orderNumber,
    status: o.status,
    currency: o.currency,
    // Alias for frontend compatibility
    total: Number(o.total),
    totalAmount: Number(o.total),
    shippingAddress: o.shippingAddress ?? null,
    createdAt: o.createdAt,
    user: o.user,
    brand: o.brand ?? null,
    organization: o.brand?.organization ?? null,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.product?.name ?? `Product ${i.productId.slice(0, 8)}`,
      sku: i.product?.sku ?? null,
      quantity: i.quantity,
      unitPrice: Number(i.unitPrice),
      // Alias for frontend compatibility
      priceAtTime: Number(i.unitPrice),
      image: i.product?.images?.[0]?.url ?? null,
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
  };
}

const ORDER_INCLUDE = {
  user: { select: { id: true, name: true, email: true } },
  brand: {
    select: {
      id: true,
      name: true,
      slug: true,
      organizationId: true,
      organization: { select: { id: true, name: true, slug: true } },
    },
  },
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
          images: {
            take: 1,
            orderBy: { position: 'asc' },
            select: { url: true },
          },
        },
      },
    },
  },
  payments: true,
};

async function listOrders(req, res, next) {
  try {
    const { status, provider, search, limit = 100 } = req.query;
    const where = {};
    if (status) where.status = status;

    const orders = await prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 100, 200),
      include: ORDER_INCLUDE,
    });

    let result = orders.map(shapeOrder);

    if (provider) {
      result = result.filter((o) =>
        o.payments.some((p) => p.provider === provider)
      );
    }

    if (search) {
      const q = String(search).toLowerCase();
      result = result.filter(
        (o) =>
          o.id.toLowerCase().includes(q) ||
          (o.orderNumber || '').toLowerCase().includes(q) ||
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
    const orderId = req.params.orderId || req.params.id;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: ORDER_INCLUDE,
    });
    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');
    res.json({ order: shapeOrder(order) });
  } catch (err) {
    next(err);
  }
}

async function confirmDelivery(req, res, next) {
  try {
    const orderId = req.params.orderId || req.params.id;
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
      select: { userId: true, id: true, orderNumber: true },
    });

    if (order?.userId) {
      notifyUser(order.userId, {
        type: 'SYSTEM',
        title: 'Your order has been delivered',
        body: `Order #${order.orderNumber || order.id.slice(0, 8).toUpperCase()} marked as delivered. Thank you for shopping with StyleAI!`,
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
    const orderId = req.params.orderId || req.params.id;
    const { reason } = req.body || {};

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { payments: true },
    });
    if (!order) throw httpError('Order not found', 404, 'NOT_FOUND');
    if (['DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'].includes(order.status)) {
      throw httpError(
        `Cannot cancel order in status ${order.status}`,
        400,
        'INVALID_STATUS'
      );
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
        data: {
          status: 'FAILED',
          description: reason ? `Cancelled: ${reason}` : 'Cancelled',
        },
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