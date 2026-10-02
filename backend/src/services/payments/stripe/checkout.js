// services/payments/stripe/checkout.js
// ======================================================
// Stripe checkout — subscription + one-off
// ======================================================

const stripe = require('./client');
const customer = require('./customer');
const { pkrToUsd } = require('../shared/currency');

const STRIPE_CURRENCY = 'usd';

function normalizeAmountAndCurrency(plan, cycle) {
  const rawAmount = cycle === 'YEARLY' ? plan.priceYearly : plan.priceMonthly;
  if (rawAmount == null || rawAmount <= 0) {
    throw new Error(`Invalid plan amount for ${plan.name} (${cycle})`);
  }
  if (plan.currency === 'PKR') {
    return { amount: pkrToUsd(rawAmount), currency: STRIPE_CURRENCY };
  }
  return {
    amount: Number(rawAmount),
    currency: String(plan.currency || 'USD').toLowerCase(),
  };
}

function isValidStripePriceId(priceId) {
  if (!priceId) return false;
  const s = String(priceId);
  if (!s.startsWith('price_')) return false;
  if (s.includes('xxxxx')) return false;
  return true;
}

// ------------------------------------------------------
// Subscription checkout
// ------------------------------------------------------
async function subscriptionCheckout({ organization, plan, cycle, successUrl, cancelUrl }) {
  const customerId = await customer.ensure(organization);
  const { amount, currency } = normalizeAmountAndCurrency(plan, cycle);

  const priceId =
    cycle === 'YEARLY' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;
  const hasValidPriceId = isValidStripePriceId(priceId);

  const lineItems = hasValidPriceId
    ? [{ price: priceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency,
            product_data: {
              name: `${plan.label} — ${cycle === 'YEARLY' ? 'Yearly' : 'Monthly'}`,
              description: plan.tagline || `StyleAI ${plan.label} plan`,
            },
            unit_amount: Math.round(amount * 100),
            recurring: { interval: cycle === 'YEARLY' ? 'year' : 'month' },
          },
          quantity: 1,
        },
      ];

  const metadata = {
    organizationId: organization.id,
    planName: plan.name,
    role: plan.role || 'BRAND',
    cycle,
  };

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: lineItems,
    // ── Proper success URL with session_id placeholder ──
    success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    // ── Top-level metadata (webhook reads this) ──
    metadata,
    // ── Subscription-level metadata (for subscription.* webhooks) ──
    subscription_data: { metadata },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return {
    url: session.url,
    method: 'REDIRECT',
    reference: session.id,
    raw: session,
  };
}

// ------------------------------------------------------
// One-off checkout (orders)
// ------------------------------------------------------
async function oneOffCheckout({
  organization,
  amount,
  currency = 'usd',
  description,
  metadata = {},
  successUrl,
  cancelUrl,
}) {
  const customerId = await customer.ensure(organization);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [
      {
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: { name: description },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${successUrl}${successUrl.includes('?') ? '&' : '?'}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata,
  });

  return {
    url: session.url,
    method: 'REDIRECT',
    reference: session.id,
    raw: session,
  };
}

module.exports = { subscriptionCheckout, oneOffCheckout };