// services/payments/stripe/checkout.js
const stripe = require('./client');
const customer = require('./customer');

async function subscriptionCheckout({ organization, plan, cycle, successUrl, cancelUrl }) {
  const customerId = await customer.ensure(organization);
  const priceId = cycle === 'YEARLY' ? plan.stripePriceIdYearly : plan.stripePriceIdMonthly;

  if (!priceId) throw new Error(`No Stripe price ID configured for plan ${plan.name} (${cycle})`);

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${cancelUrl}?status=cancel`,
    subscription_data: {
      metadata: { organizationId: organization.id, planName: plan.name, cycle },
    },
    allow_promotion_codes: true,
    billing_address_collection: 'auto',
  });

  return { url: session.url, method: 'REDIRECT', reference: session.id, raw: session };
}

async function oneOffCheckout({ organization, amount, currency = 'usd', description, metadata = {}, successUrl, cancelUrl }) {
  const customerId = await customer.ensure(organization);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer: customerId,
    line_items: [{
      price_data: {
        currency,
        product_data: { name: description },
        unit_amount: Math.round(amount * 100),
      },
      quantity: 1,
    }],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${cancelUrl}?status=cancel`,
    metadata,
  });

  return { url: session.url, method: 'REDIRECT', reference: session.id, raw: session };
}

module.exports = { subscriptionCheckout, oneOffCheckout };