const prisma = require('../config/prisma');

// ======================================================
// Helper — get or create the cart for current user
// ======================================================
async function getOrCreateCart(userId) {
  let cart = await prisma.cart.findUnique({
    where: { userId },
    include: {
      items: {
        include: {
          product: {
            include: { images: true, brand: true },
          },
        },
      },
    },
  });

  if (!cart) {
    cart = await prisma.cart.create({
      data: { userId },
      include: {
        items: {
          include: {
            product: {
              include: { images: true, brand: true },
            },
          },
        },
      },
    });
  }

  return cart;
}

// ======================================================
// GET /api/cart  → my cart
// ======================================================
async function getCart(req, res, next) {
  try {
    const cart = await getOrCreateCart(req.user.id);

    const subtotal = cart.items.reduce((sum, item) => {
      const price = Number(item.product.price ?? 0);
      return sum + price * item.quantity;
    }, 0);

    res.json({
      id: cart.id,
      items: cart.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        quantity: i.quantity,
        product: {
          id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          currency: i.product.currency,
          image: i.product.images?.[0]?.url ?? null,
          brand: i.product.brand?.name ?? null,
        },
        lineTotal: Number(i.product.price ?? 0) * i.quantity,
      })),
      subtotal,
      itemCount: cart.items.reduce((n, i) => n + i.quantity, 0),
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// POST /api/cart/items  → add item
// Body: { productId, quantity? }
// ======================================================
async function addItem(req, res, next) {
  try {
    const { productId, quantity = 1 } = req.body;

    if (!productId) {
      return res.status(400).json({ message: 'productId required' });
    }
    if (quantity < 1) {
      return res.status(400).json({ message: 'quantity must be >= 1' });
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const cart = await getOrCreateCart(req.user.id);

    // Upsert — if item exists, add quantity; else create
    const item = await prisma.cartItem.upsert({
      where: {
        cartId_productId: { cartId: cart.id, productId },
      },
      update: {
        quantity: { increment: quantity },
      },
      create: {
        cartId: cart.id,
        productId,
        quantity,
      },
      include: {
        product: { include: { images: true, brand: true } },
      },
    });

    res.status(201).json({
      message: 'Item added to cart',
      item: {
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
        product: {
          id: item.product.id,
          name: item.product.name,
          price: item.product.price,
          image: item.product.images?.[0]?.url ?? null,
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// PATCH /api/cart/items/:productId  → update quantity
// Body: { quantity }
// ======================================================
async function updateItem(req, res, next) {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (!quantity || quantity < 1) {
      return res.status(400).json({ message: 'quantity must be >= 1' });
    }

    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!item) return res.status(404).json({ message: 'Item not in cart' });

    const updated = await prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
    });

    res.json({ message: 'Quantity updated', item: updated });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// DELETE /api/cart/items/:productId  → remove one item
// ======================================================
async function removeItem(req, res, next) {
  try {
    const { productId } = req.params;

    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return res.status(404).json({ message: 'Cart not found' });

    const item = await prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });
    if (!item) return res.status(404).json({ message: 'Item not in cart' });

    await prisma.cartItem.delete({ where: { id: item.id } });

    res.json({ message: 'Item removed from cart' });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// DELETE /api/cart  → clear entire cart
// ======================================================
async function clearCart(req, res, next) {
  try {
    const cart = await prisma.cart.findUnique({ where: { userId: req.user.id } });
    if (!cart) return res.json({ message: 'Cart already empty' });

    await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

    res.json({ message: 'Cart cleared' });
  } catch (err) {
    next(err);
  }
}

module.exports = { getCart, addItem, updateItem, removeItem, clearCart };