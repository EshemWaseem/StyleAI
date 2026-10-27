// controllers/paymentController.js
const payments = require('../services/payments');
const prisma = require('../config/prisma');
const { httpError } = require('../services/influencer/helpers');

// GET /api/payments/methods/:context
async function getMethods(req, res, next) {
  try {
    const { context } = req.params;
    const allowed = payments.config.allowedByContext[context];
    if (!allowed) throw httpError(`Unknown context: ${context}`, 400, 'UNKNOWN_CONTEXT');
    res.json({ context, providers: allowed });
  } catch (e) { next(e); }
}

// POST /api/payments/subscription/checkout
async function subscriptionCheckout(req, res, next) {
  try {
    const { planName, cycle = 'MONTHLY', provider = 'STRIPE' } = req.body || {};
    const successUrl = `${payments.config.shared.FRONTEND_URL}/billing?status=success`;
    const cancelUrl  = `${payments.config.shared.FRONTEND_URL}/billing?status=cancel`;

    const session = await payments.checkout.createSubscriptionCheckout(req.user, {
      planName,
      cycle,
      provider,
      successUrl,
      cancelUrl,
    });

    res.json(session);
  } catch (e) { next(e); }
}

// POST /api/payments/subscription/verify-session
async function verifySession(req, res, next) {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required', code: 'MISSING_SESSION_ID' });
    }

    const stripe = require('../services/payments/stripe/client');
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }

    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(400).json({
        message: 'Payment not completed',
        code: 'NOT_PAID',
        payment_status: session.payment_status,
        status: session.status,
      });
    }

    const { handle } = require('../services/payments/stripe/handlers/checkoutCompleted');
    await handle(session);

    try {
      const { clearTrialCache } = require('../middleware/trialGate');
      if (req.user?.id) clearTrialCache(req.user.id);
    } catch { /* trialGate may not be wired yet */ }

    const svc = require('../services/billing');
    const fresh = await svc.getMyBilling(req.user);

    res.json({ ok: true, applied: true, subscription: fresh.subscription });
  } catch (e) { next(e); }
}

// POST /api/payments/order/checkout
// Accepts:
//   Path A: { orderId, provider }              → existing order
//   Path B: { cartItems, shippingAddress, currency, provider } → creates order first
async function orderCheckout(req, res, next) {
  try {
    const {
      orderId,
      cartItems,
      shippingAddress,
      currency,
      provider = 'STRIPE',
    } = req.body || {};

    const successUrl = `${payments.config.shared.FRONTEND_URL}/payments/result?status=success`;
    const cancelUrl  = `${payments.config.shared.FRONTEND_URL}/payments/result?status=cancel`;

    let finalOrderId = orderId;

    // If order doesn't exist yet, create it from cart items
    if (!finalOrderId && Array.isArray(cartItems) && cartItems.length > 0) {
      const orderSvc = require('../services/orders');
      const order = await orderSvc.createOrderFromCart(req.user, {
        cartItems,
        shippingAddress,
        currency,
      });
      finalOrderId = order.id;
    }

    if (!finalOrderId) {
      return res.status(400).json({
        message: 'Either orderId or cartItems is required',
        code: 'MISSING_ORDER_INPUT',
      });
    }

    const session = await payments.orders.createOrderCheckout(req.user, {
      orderId: finalOrderId,
      provider,
      successUrl,
      cancelUrl,
    });

    res.json({ ...session, orderId: finalOrderId });
  } catch (e) { next(e); }
}

// POST /api/payments/order/cod/confirm  (admin only)
async function confirmCod(req, res, next) {
  try {
    if (!req.user.roles?.includes('SUPER_ADMIN')) {
      throw httpError('Admin only', 403, 'FORBIDDEN');
    }
    const { orderId } = req.body || {};
    if (!orderId) throw httpError('orderId required', 400, 'MISSING_ORDER_ID');

    const gateway = payments.registry.get('COD');
    const order = await gateway.confirm(orderId, req.user.id);
    res.json({ order });
  } catch (e) { next(e); }
}

// POST /api/payments/portal  (Stripe customer portal)
async function createPortal(req, res, next) {
  try {
    if (!payments.config.stripe.enabled) {
      throw httpError('Stripe is not enabled', 400, 'STRIPE_DISABLED');
    }
    const org = await prisma.organization.findUnique({
      where: { id: req.user.organizationId },
    });
    if (!org) throw httpError('Organization not found', 404, 'ORG_NOT_FOUND');

    const gateway = payments.registry.get('STRIPE');
    const returnUrl = `${payments.config.shared.FRONTEND_URL}/billing`;
    const session = await gateway.createPortalSession(org, returnUrl);
    res.json(session);
  } catch (e) { next(e); }
}


// paymentController.js — NAYA function
async function verifyOrderSession(req, res, next) {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) {
      return res.status(400).json({ message: 'sessionId is required', code: 'MISSING_SESSION_ID' });
    }

    const stripe = require('../services/payments/stripe/client');
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (!session) {
      return res.status(404).json({ message: 'Session not found', code: 'SESSION_NOT_FOUND' });
    }

    if (session.payment_status !== 'paid') {
      return res.status(400).json({
        message: 'Payment not completed',
        code: 'NOT_PAID',
        payment_status: session.payment_status,
      });
    }

    const { handle } = require('../services/payments/stripe/handlers/checkoutCompleted');
    await handle(session);

    const orderId = session.metadata?.orderId;
    let order = null;
    if (orderId) {
      order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { items: true, payments: true },
      });
    }

    res.json({ ok: true, applied: true, order });
  } catch (e) {
    next(e);
  }
}



module.exports = {
  getMethods,
  subscriptionCheckout,
  verifySession,
  verifyOrderSession,
  orderCheckout,
  confirmCod,
  createPortal,
};