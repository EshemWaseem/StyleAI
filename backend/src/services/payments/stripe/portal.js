// services/payments/stripe/portal.js
const stripe = require('./client');
const customer = require('./customer');

async function create(organization, returnUrl) {
  const customerId = await customer.ensure(organization);
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });
  return { url: session.url };
}

module.exports = { create };