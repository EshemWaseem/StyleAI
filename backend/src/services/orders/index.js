// services/orders/index.js
const crypto = require('crypto');
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

function generateOrderNumber() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return `ORD-${y}${m}${d}-${rand}`;
}

async function createOrderFromCart(user, { cartItems, shippingAddress, currency = 'PKR' }) {
  if (!Array.isArray(cartItems) || cartItems.length === 0) {
    throw httpError('Cart is empty', 400, 'EMPTY_CART');
  }
  if (!shippingAddress?.city || !shippingAddress?.street || !shippingAddress?.phone) {
    throw httpError('Complete shipping address is required', 400, 'MISSING_ADDRESS');
  }

  const productIds = cartItems.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: {
      id: true,
      name: true,
      price: true,
      currency: true,
      brand: { select: { id: true, organizationId: true } },
    },
  });

  if (products.length !== productIds.length) {
    throw httpError('One or more products are invalid', 400, 'INVALID_PRODUCTS');
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  let total = 0;
  const lineItems = [];

  for (const item of cartItems) {
    const product = productMap.get(item.productId);
    const price = Number(product.price || 0);
    const qty = Math.max(1, parseInt(item.quantity) || 1);
    total += price * qty;
    lineItems.push({
      productId: product.id,
      quantity: qty,
      unitPrice: price,
    });
  }

  if (total <= 0) {
    throw httpError('Order total is invalid', 400, 'INVALID_TOTAL');
  }

  const brandId = products[0].brand?.id || null;
  const orderCurrency = currency || products[0].currency || 'PKR';
  const orderNumber = generateOrderNumber();

  const order = await prisma.order.create({
    data: {
      orderNumber,
      userId: user.id,
      brandId,
      total,
      currency: orderCurrency,
      status: 'PENDING',
      shippingAddress,
      items: { create: lineItems },
    },
    include: {
      items: true,
      brand: { select: { id: true, organizationId: true } },
    },
  });

  // Clear shopper's cart — CartItem has no userId; go via Cart relation.
  // Best-effort: cart may not exist in some flows (direct checkout).
  await prisma.cartItem.deleteMany({
    where: { cart: { userId: user.id } },
  }).catch(() => {});

  return order;
}

module.exports = { createOrderFromCart, generateOrderNumber };