// backend/src/controllers/orderController.js
const prisma = require('../config/prisma');
const orderSvc = require('../services/orders');

function shapeOrder(o) {
  return {
    id: o.id,
    status: o.status,
    totalAmount: Number(o.totalAmount ?? 0),
    currency: o.currency,
    shippingAddress: o.shippingAddress || null,
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    items: (o.items || []).map((i) => ({
      id: i.id,
      productId: i.productId,
      name: i.name,
      quantity: i.quantity,
      priceAtTime: Number(i.priceAtTime ?? 0),
    })),
    payments: (o.payments || []).map((p) => ({
      id: p.id,
      invoiceNumber: p.invoiceNumber,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      provider: p.provider,
      context: p.context,
      paidAt: p.paidAt,
    })),
  };
}

async function createOrder(req, res, next) {
  try {
    const { cartItems, shippingAddress, currency } = req.body || {};

    const order = await orderSvc.createOrderFromCart(req.user, {
      cartItems,
      shippingAddress,
      currency,
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order: shapeOrder(order),
    });
  } catch (err) {
    next(err);
  }
}

async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
        payments: true,
      },
    });

    res.json({
      count: orders.length,
      orders: orders.map(shapeOrder),
    });
  } catch (err) {
    next(err);
  }
}

async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: true,
        payments: true,
      },
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.roles?.includes('SUPER_ADMIN');
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not your order' });
    }

    res.json({ order: shapeOrder(order) });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrder };