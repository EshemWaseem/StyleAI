// services/payments/stripe/customer.js
const prisma = require('../../../config/prisma');
const stripe = require('./client');

async function ensure(organization) {
  const sub = await prisma.subscription.findUnique({
    where: { organizationId: organization.id },
    select: { stripeCustomerId: true },
  });

  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: organization.name,
    email: organization.billingEmail || undefined,
    phone: organization.billingPhone || undefined,
    metadata: { organizationId: organization.id },
  });

  await prisma.subscription.upsert({
    where: { organizationId: organization.id },
    update: { stripeCustomerId: customer.id },
    create: {
      organizationId: organization.id,
      planName: 'free',
      status: 'ACTIVE',
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

module.exports = { ensure };