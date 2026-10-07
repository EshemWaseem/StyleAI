// services/payments/stripe/checkout.js
// ======================================================
// Stripe checkout — subscription + one-off (wallet top-up, orders)
// ======================================================

const stripe = require('./client');
const customer = require('./customer');
const { pkrToUsd } = require('../shared/currency');

const STRIPE_CURRENCY = 'usd';

// ---------- Helpers ----------
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

/** Safely append session_id placeholder to a URL. */
function appendSessionId(url) {
  const base = String(url || '').trim() || 'http://localhost:3000';
  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}session_id={CHECKOUT_SESSION_ID}`;
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
    success_url: appendSessionId(successUrl),
    cancel_url: cancelUrl || 'http://localhost:3000',
    metadata,
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
// One-off checkout (wallet top-up, orders)
// ------------------------------------------------------
async function oneOffCheckout({
  organization,
  user,                        // ← optional; used if no organization
  amount,
  currency = 'pkr',
  description,
  metadata = {},
  successUrl,
  cancelUrl,
}) {
  // ---- Resolve Stripe customer (org or user) ----
  let customerId = null;
  try {
    if (organization) {
      customerId = await customer.ensure(organization);
    } else if (user) {
      customerId = await customer.ensureForUser(user);
    }
  } catch (e) {
    console.warn('[stripe.oneOffCheckout] customer.ensure failed (continuing without customer):', e.message);
    customerId = null;
  }

  // ---- Build session payload ----
  const sessionPayload = {
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: String(currency).toLowerCase(),
          product_data: { name: description || 'Payment' },
          unit_amount: Math.round(Number(amount) * 100),
        },
        quantity: 1,
      },
    ],
    success_url: appendSessionId(successUrl),
    cancel_url: cancelUrl || 'http://localhost:3000',
    metadata,
  };

  if (customerId) {
    sessionPayload.customer = customerId;
  }

  const session = await stripe.checkout.sessions.create(sessionPayload);

  return {
    url: session.url,
    method: 'REDIRECT',
    reference: session.id,
    raw: session,
  };
}

module.exports = { subscriptionCheckout, oneOffCheckout };