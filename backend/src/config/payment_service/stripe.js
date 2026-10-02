// config/payment_service/stripe.js
const { isProd } = require('./shared');

module.exports = {
  enabled: !!process.env.STRIPE_SECRET_KEY,
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  apiVersion: '2026-08-26.dahlia',   // ← YEH UPDATE KARO
  mode: isProd ? 'live' : 'test',
};