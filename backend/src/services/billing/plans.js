// services/billing/plans.js
// ======================================================
// Plan catalog — code-defined, single source of truth
// ======================================================

const PLANS = {
  free: {
    name: 'free',
    label: 'Free',
    priceMonthly: 0,
    priceYearly: 0,
    currency: 'USD',
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      'Up to 5 products',
      '10 AI analyses / month',
      'Basic matching',
      'Community support',
    ],
    limits: {
      products: 5,
      aiPerMonth: 10,
      campaignsPerMonth: 1,
      teamSeats: 1,
      storageMb: 100,
    },
  },
  starter: {
    name: 'starter',
    label: 'Starter',
    priceMonthly: 49,
    priceYearly: 490,
    currency: 'USD',
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STARTER_MONTHLY || null,
    stripePriceIdYearly:  process.env.STRIPE_PRICE_STARTER_YEARLY  || null,
    features: [
      'Up to 50 products',
      '200 AI analyses / month',
      'AI matching',
      'Email support',
      '5 team seats',
    ],
    limits: {
      products: 50,
      aiPerMonth: 200,
      campaignsPerMonth: 10,
      teamSeats: 5,
      storageMb: 2000,
    },
  },
  studio: {
    name: 'studio',
    label: 'Studio',
    priceMonthly: 199,
    priceYearly: 1990,
    currency: 'USD',
    popular: true,
    stripePriceIdMonthly: process.env.STRIPE_PRICE_STUDIO_MONTHLY || null,
    stripePriceIdYearly:  process.env.STRIPE_PRICE_STUDIO_YEARLY  || null,
    features: [
      'Unlimited products',
      '1,000 AI analyses / month',
      'AI matching + Content Studio',
      'AI Photography (100/mo)',
      'Priority support',
      '20 team seats',
    ],
    limits: {
      products: null,
      aiPerMonth: 1000,
      campaignsPerMonth: 100,
      teamSeats: 20,
      storageMb: 20000,
    },
  },
  enterprise: {
    name: 'enterprise',
    label: 'Enterprise',
    priceMonthly: null,
    priceYearly: null,
    currency: 'USD',
    stripePriceIdMonthly: null,
    stripePriceIdYearly: null,
    features: [
      'Everything in Studio',
      'Custom AI fine-tuning',
      'Dedicated account manager',
      'SLA + SSO',
      'Unlimited team seats',
    ],
    limits: {
      products: null,
      aiPerMonth: null,
      campaignsPerMonth: null,
      teamSeats: null,
      storageMb: null,
    },
  },
};

function getPlan(name) {
  return PLANS[name] || null;
}

function listPlans() {
  return Object.values(PLANS);
}

module.exports = { PLANS, getPlan, listPlans };