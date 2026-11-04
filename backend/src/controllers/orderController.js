// backend/src/controllers/orderController.js
const prisma = require('../config/prisma');
const orderSvc = require('../services/orders');

const VALID_STATUSES = ['PENDING', 'PROCESSING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'COMPLETED', 'CANCELLED'];

function getProductImage(product) {
  if (!product) return null;
  if (product.primaryImage) return product.primaryImage;
  if (Array.isArray(product.images) && product.images.length > 0) {
    const img = product.images[0];
    if (typeof img === 'string') return img;
    if (img && typeof img === 'object' && img.url) return img.url;
  }
  if (typeof product.images === 'string') {
    try {
      const parsed = JSON.parse(product.images);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const img = parsed[0];
        if (typeof img === 'string') return img;
        if (img && typeof img === 'object' && img.url) return img.url;
      }
    } catch (e) {}
  }
  return null;
}

function shapeOrder(o) {
  return {
    id: o.id,
    status: o.status,
    totalAmount: Number(o.totalAmount ?? o.total ?? 0),
    currency: o.currency,
    shippingAddress: o.shippingAddress || null,
    trackingNumber: o.trackingNumber || null,
    courierName: o.courierName || null,
    paymentProvider: o.paymentProvider || null, // 🆕 Return provider
    createdAt: o.createdAt,
    updatedAt: o.updatedAt,
    user: o.user ? { id: o.user.id, name: o.user.name, email: o.user.email } : null,
    items: (o.items || []).map((i) => {
      const itemPrice = Number(i.priceAtTime || i.unitPrice) > 0 ? Number(i.priceAtTime || i.unitPrice) : Number(i.product?.price || 0);
      return {
        id: i.id,
        productId: i.productId,
        name: i.name || i.product?.name || 'Product',
        quantity: i.quantity,
        price: itemPrice,
        priceAtTime: itemPrice,
        product: i.product ? {
          id: i.product.id,
          name: i.product.name,
          primaryImage: getProductImage(i.product),
        } : null,
      };
    }),
    payments: (o.payments || []).map((p) => ({
      id: p.id, invoiceNumber: p.invoiceNumber, amount: Number(p.amount), currency: p.currency, status: p.status, provider: p.provider, context: p.context, paidAt: p.paidAt,
    })),
  };
}

async function createOrder(req, res, next) {
  try {
    const { cartItems, shippingAddress, currency } = req.body || {};
    const order = await orderSvc.createOrderFromCart(req.user, { cartItems, shippingAddress, currency });
    res.status(201).json({ message: 'Order placed successfully', order: shapeOrder(order) });
  } catch (err) { next(err); }
}

async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { include: { images: true } } } },
        payments: true,
      },
    });
    res.json({ count: orders.length, orders: orders.map(shapeOrder) });
  } catch (err) { next(err); }
}

async function listAllOrders(req, res, next) {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = status ? { status: status.toUpperCase() } : {};

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where, orderBy: { createdAt: 'desc' }, skip, take: Number(limit),
        include: {
          user: { select: { id: true, name: true, email: true } },
          items: { include: { product: { include: { images: true } } } },
          payments: true,
        },
      }),
      prisma.order.count({ where }),
    ]);
    res.json({ total, page: Number(page), limit: Number(limit), orders: orders.map(shapeOrder) });
  } catch (err) { next(err); }
}

async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { images: true } } } },
        payments: true,
      },
    });
    if (!order) return res.status(404).json({ message: 'Order not found' });
    const isOwner = order.userId === req.user.id;
    const isAdmin = req.user.roles?.includes('SUPER_ADMIN');
    if (!isOwner && !isAdmin) return res.status(403).json({ message: 'Not your order' });
    res.json({ order: shapeOrder(order) });
  } catch (err) { next(err); }
}

// 🆕 CONFIRM ORDER (User clicks this)
async function confirmOrder(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.order.findUnique({ where: { id }, include: { user: true } });
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });
    if (existing.status !== 'PENDING') return res.status(400).json({ message: 'Only pending orders can be confirmed' });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'CONFIRMED', updatedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { images: true } } } },
        payments: true,
      },
    });

    const { sendToUser } = require('../services/email');
    sendToUser(existing.userId, 'orderConfirmed', {
      name: existing.user.name,
      orderId: existing.orderNumber || existing.id.slice(0, 8).toUpperCase(),
      total: Number(existing.total || 0),
      currency: existing.currency || 'PKR',
    }).catch(e => console.error("Confirm email failed:", e));

    res.json({ message: 'Order confirmed successfully', order: shapeOrder(updated) });
  } catch (err) { next(err); }
}

// 🆕 DELETE ORDER (If pending by user)
async function deleteOrder(req, res, next) {
  try {
    const { id } = req.params;
    const existing = await prisma.order.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ message: 'Order not found' });
    if (existing.userId !== req.user.id) return res.status(403).json({ message: 'Forbidden' });

    if (existing.status !== 'PENDING') {
      return res.status(400).json({ message: 'Only pending orders can be deleted' });
    }

    await prisma.order.delete({ where: { id } });
    res.json({ message: 'Order deleted successfully' });
  } catch (err) { next(err); }
}

async function updateOrderStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note } = req.body || {};
    if (!status) return res.status(400).json({ message: 'Status is required' });
    const normalized = status.toUpperCase();
    if (!VALID_STATUSES.includes(normalized)) return res.status(400).json({ message: `Invalid status` });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: normalized, ...(note && { statusNote: note }), updatedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { images: true } } } },
        payments: true,
      },
    });
    res.json({ message: `Status updated`, order: shapeOrder(updated) });
  } catch (err) { next(err); }
}

async function shipOrder(req, res, next) {
  try {
    const { id } = req.params;
    const { courierName, trackingNumber } = req.body;
    if (!courierName || !trackingNumber) return res.status(400).json({ message: 'courierName and trackingNumber are required' });

    const updated = await prisma.order.update({
      where: { id },
      data: { status: 'SHIPPED', courierName, trackingNumber, updatedAt: new Date() },
      include: {
        user: { select: { id: true, name: true, email: true } },
        items: { include: { product: { include: { images: true } } } },
        payments: true,
      },
    });
    res.json({ message: 'Order marked as Shipped', order: shapeOrder(updated) });
  } catch (err) { next(err); }
}

module.exports = { createOrder, listOrders, listAllOrders, getOrder, confirmOrder, deleteOrder, updateOrderStatus, shipOrder };