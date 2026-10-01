// controllers/webhookController.js
const payments = require('../services/payments');
const { PaymentError } = require('../services/payments/core/errors');

// POST /api/webhooks/stripe
// Raw body is applied at route level (express.raw)
async function stripeWebhook(req, res) {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) throw new PaymentError('Missing stripe-signature header', 400, 'NO_SIGNATURE');

    await payments.webhook.handleStripe(req.body, signature);
    res.json({ received: true });
  } catch (e) {
    console.error('[stripe webhook]', e.message);
    res.status(400).json({ error: e.message });
  }
}

// POST /api/webhooks/jazzcash
async function jazzcashWebhook(req, res) {
  try {
    const normalized = await payments.webhook.handleWalletReturn('JAZZCASH', req.body);
    const url = `${payments.config.shared.FRONTEND_URL}/payments/result?ref=${encodeURIComponent(normalized.reference)}&status=${normalized.status}`;
    res.redirect(url);
  } catch (e) {
    console.error('[jazzcash webhook]', e.message);
    const url = `${payments.config.shared.FRONTEND_URL}/payments/result?status=failed`;
    res.redirect(url);
  }
}

// POST /api/webhooks/easypaisa
async function easypaisaWebhook(req, res) {
  try {
    const normalized = await payments.webhook.handleWalletReturn('EASYPAISA', req.body);
    const url = `${payments.config.shared.FRONTEND_URL}/payments/result?ref=${encodeURIComponent(normalized.reference)}&status=${normalized.status}`;
    res.redirect(url);
  } catch (e) {
    console.error('[easypaisa webhook]', e.message);
    const url = `${payments.config.shared.FRONTEND_URL}/payments/result?status=failed`;
    res.redirect(url);
  }
}

module.exports = { stripeWebhook, jazzcashWebhook, easypaisaWebhook };