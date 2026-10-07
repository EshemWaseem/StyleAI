// services/payments/stripe/customer.js
// ======================================================
// Stripe customer management for orgs AND individual users.
// ======================================================
const prisma = require('../../../config/prisma');
const stripe = require('./client');

// ------------------------------------------------------
// Organization customer (brand/agency)
// ------------------------------------------------------
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

// ------------------------------------------------------
// User customer (influencer/shopper — wallet top-ups etc.)
// ------------------------------------------------------
async function ensureForUser(user) {
  if (!user?.id) throw new Error('ensureForUser: user.id required');

  const sub = await prisma.subscription.findUnique({
    where: { userId: user.id },
    select: { stripeCustomerId: true },
  });

  if (sub?.stripeCustomerId) return sub.stripeCustomerId;

  const customer = await stripe.customers.create({
    name: user.name || undefined,
    email: user.email || undefined,
    metadata: { userId: user.id },
  });

  // Upsert the user's subscription row with the customer ID.
  // If they have no subscription yet (pure shopper), create a minimal row.
  await prisma.subscription.upsert({
    where: { userId: user.id },
    update: { stripeCustomerId: customer.id },
    create: {
      userId: user.id,
      role: 'INFLUENCER',           // default role for user-scoped subs
      planName: 'free',
      status: 'ACTIVE',
      stripeCustomerId: customer.id,
    },
  });

  return customer.id;
}

module.exports = { ensure, ensureForUser };