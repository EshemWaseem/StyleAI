// services/payments/stripe/checkout.js
//      ==
// Stripe checkout — subscription + one-off (wallet top-up, orders)
// Handles both organization-tied (BRAND/AGENCY) and
// user-tied (INFLUENCER) customers.
//      ==

const stripe = require('./client');
const customer = require('./customer');
const { pkrToUsd } = require('../shared/currency');

const STRIPE_CURRENCY = 'usd';

//  - Helpers  -
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

//       
// Resolve Stripe customer for either org or user
//       
async function resolveCustomerId({ organization, user }) {
  if (organization && organization.id) {
    return customer.ensure(organization);
  }
  if (user && user.id) {
    return customer.ensureForUser(user);
  }
  throw new Error(
    'Cannot resolve Stripe customer: neither organization nor user provided'
  );
}

//       
// Subscription checkout
//       
async function subscriptionCheckout({
  organization,
  user,
  plan,
  cycle,
  successUrl,
  cancelUrl,
}) {
  // ✅ Resolve customer — org OR user (never null)
  const customerId = await resolveCustomerId({ organization, user });

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

  // ✅ Metadata — only include keys that have values
  const metadata = {
    planName: plan.name,
    role: plan.role || 'BRAND',
    cycle,
  };
  if (organization && organization.id) metadata.organizationId = organization.id;
  if (user && user.id) metadata.userId = user.id;

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

//       
// One-off checkout (wallet top-up, orders)
//       
async function oneOffCheckout({
  organization,
  user,
  amount,
  currency = 'pkr',
  description,
  metadata = {},
  successUrl,
  cancelUrl,
}) {
  let customerId = null;
  try {
    if (organization && organization.id) {
      customerId = await customer.ensure(organization);
    } else if (user && user.id) {
      customerId = await customer.ensureForUser(user);
    }
  } catch (e) {
    console.warn(
      '[stripe.oneOffCheckout] customer.ensure failed (continuing without customer):',
      e.message
    );
    customerId = null;
  }

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