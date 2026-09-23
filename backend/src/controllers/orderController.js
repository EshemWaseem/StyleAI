const prisma = require('../config/prisma');

// ======================================================
// POST /api/orders  → checkout (cart → order)
// ======================================================
async function createOrder(req, res, next) {
  try {
    const cart = await prisma.cart.findUnique({
      where: { userId: req.user.id },
      include: {
        items: { include: { product: true } },
      },
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Validate inventory for every item
    for (const item of cart.items) {
      if (item.product.inventory != null && item.product.inventory < item.quantity) {
        return res.status(400).json({
          message: `Insufficient inventory for ${item.product.name}`,
          productId: item.productId,
          available: item.product.inventory,
          requested: item.quantity,
        });
      }
    }

    const total = cart.items.reduce(
      (sum, item) => sum + Number(item.product.price ?? 0) * item.quantity,
      0
    );

    const currency = cart.items[0]?.product.currency || 'USD';

    // Transaction: create order, create items, decrement inventory, clear cart
    const order = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          userId: req.user.id,
          status: 'PENDING',
          total,
          currency,
          items: {
            create: cart.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: Number(item.product.price ?? 0),
            })),
          },
        },
        include: {
          items: { include: { product: { include: { images: true } } } },
        },
      });

      // Decrement inventory (only if it's tracked)
      for (const item of cart.items) {
        if (item.product.inventory != null) {
          await tx.product.update({
            where: { id: item.productId },
            data: { inventory: { decrement: item.quantity } },
          });
        }
      }

      // Clear the cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });

      return created;
    });

    res.status(201).json({
      message: 'Order placed successfully',
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          image: i.product.images?.[0]?.url ?? null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET /api/orders  → list my orders (most recent first)
// ======================================================
async function listOrders(req, res, next) {
  try {
    const orders = await prisma.order.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        items: { include: { product: { include: { images: true } } } },
      },
    });

    res.json({
      count: orders.length,
      orders: orders.map((o) => ({
        id: o.id,
        status: o.status,
        total: o.total,
        currency: o.currency,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((n, i) => n + i.quantity, 0),
        items: o.items.map((i) => ({
          productId: i.productId,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          image: i.product.images?.[0]?.url ?? null,
        })),
      })),
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// GET /api/orders/:id  → single order (only if mine)
// ======================================================
async function getOrder(req, res, next) {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: { include: { images: true } } } },
      },
    });

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Ownership check — users see only their own orders
    if (order.userId !== req.user.id && !req.user.roles.includes('SUPER_ADMIN')) {
      return res.status(403).json({ message: 'Not your order' });
    }

    res.json({
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        currency: order.currency,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        items: order.items.map((i) => ({
          id: i.id,
          productId: i.productId,
          name: i.product.name,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          image: i.product.images?.[0]?.url ?? null,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { createOrder, listOrders, getOrder };