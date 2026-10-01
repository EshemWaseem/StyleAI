// services/billing/plans.js
// ======================================================
// Plan catalog — role-aware SaaS plans
// ======================================================

// Helper to reduce repetition
function pickStripe(envPrefix) {
  return {
    stripePriceIdMonthly: process.env[`STRIPE_PRICE_${envPrefix}_MONTHLY`] || null,
    stripePriceIdYearly:  process.env[`STRIPE_PRICE_${envPrefix}_YEARLY`]  || null,
  };
}

const PLANS = {
  // ====================================================
  // BRAND plans
  // ====================================================
  BRAND: {
    trial: {
      name: 'trial',
      role: 'BRAND',
      label: 'Free Trial',
      tagline: 'Full Studio access for 3 days',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'PKR',
      isTrial: true,
      trialDays: 3,
      takeRate: 0, // no campaigns during trial
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        '3-day full Studio access',
        'Up to 20 products',
        '100 AI text calls',
        '10 AI image calls',
        '2 campaigns',
        '5 team seats',
      ],
      limits: {
        products: 20,
        aiTextPerMonth: 100,
        aiImagePerMonth: 10,
        campaignsPerMonth: 2,
        teamSeats: 5,
        storageMb: 500,
        knowledgeDocs: 3,
        assistantMessages: 50,
      },
    },
    starter: {
      name: 'starter',
      role: 'BRAND',
      label: 'Starter',
      tagline: 'For small brands getting started',
      priceMonthly: 5000,
      priceYearly: 50000,
      currency: 'PKR',
      popular: false,
      takeRate: 0.08,
      ...pickStripe('BRAND_STARTER'),
      features: [
        '50 products',
        '300 AI text calls / month',
        '15 AI image calls / month',
        '5 campaigns / month',
        '5 team seats',
        'Email support',
      ],
      limits: {
        products: 50,
        aiTextPerMonth: 300,
        aiImagePerMonth: 15,
        campaignsPerMonth: 5,
        teamSeats: 5,
        storageMb: 2000,
        knowledgeDocs: 5,
        assistantMessages: 100,
      },
    },
    growth: {
      name: 'growth',
      role: 'BRAND',
      label: 'Growth',
      tagline: 'For growing brands with active campaigns',
      priceMonthly: 15000,
      priceYearly: 150000,
      currency: 'PKR',
      popular: true,
      takeRate: 0.06,
      ...pickStripe('BRAND_GROWTH'),
      features: [
        '300 products',
        '1,500 AI text calls / month',
        '100 AI image calls / month',
        '20 campaigns / month',
        '15 team seats',
        'Priority support',
      ],
      limits: {
        products: 300,
        aiTextPerMonth: 1500,
        aiImagePerMonth: 100,
        campaignsPerMonth: 20,
        teamSeats: 15,
        storageMb: 10000,
        knowledgeDocs: 25,
        assistantMessages: 1000,
      },
    },
    studio: {
      name: 'studio',
      role: 'BRAND',
      label: 'Studio',
      tagline: 'For established brands running campaigns at scale',
      priceMonthly: 35000,
      priceYearly: 350000,
      currency: 'PKR',
      popular: false,
      takeRate: 0.04,
      ...pickStripe('BRAND_STUDIO'),
      features: [
        '1,500 products',
        '6,000 AI text calls / month',
        '500 AI image calls / month',
        '75 campaigns / month',
        '40 team seats',
        'Priority support',
      ],
      limits: {
        products: 1500,
        aiTextPerMonth: 6000,
        aiImagePerMonth: 500,
        campaignsPerMonth: 75,
        teamSeats: 40,
        storageMb: 50000,
        knowledgeDocs: 100,
        assistantMessages: 10000,
      },
    },
    enterprise: {
      name: 'enterprise',
      role: 'BRAND',
      label: 'Enterprise',
      tagline: 'Custom requirements, dedicated support',
      priceMonthly: 90000,
      priceYearly: 900000,
      currency: 'PKR',
      takeRate: 0.025,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        'Unlimited products',
        'Unlimited AI text',
        '2,000 AI image calls / month',
        'Unlimited campaigns',
        'Unlimited team seats',
        'Dedicated account manager + API access + SLA',
      ],
      limits: {
        products: null,
        aiTextPerMonth: null,
        aiImagePerMonth: 2000,
        campaignsPerMonth: null,
        teamSeats: null,
        storageMb: null,
        knowledgeDocs: null,
        assistantMessages: null,
      },
    },
  },

  // ====================================================
  // AGENCY plans
  // ====================================================
  AGENCY: {
    trial: {
      name: 'trial',
      role: 'AGENCY',
      label: 'Free Trial',
      tagline: 'Full Studio access for 3 days',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'PKR',
      isTrial: true,
      trialDays: 3,
      takeRate: 0,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        '3-day full Studio access',
        'Up to 3 managed brands',
        'Full AI features',
      ],
      limits: {
        managedBrands: 3,
        products: 300,
        aiTextPerMonth: 1500,
        aiImagePerMonth: 100,
        campaignsPerMonth: 20,
        teamSeats: 10,
        storageMb: 10000,
        knowledgeDocs: 25,
        assistantMessages: 1000,
      },
    },
    solo: {
      name: 'solo',
      role: 'AGENCY',
      label: 'Solo',
      tagline: 'For freelancers managing a few brands',
      priceMonthly: 20000,
      priceYearly: 200000,
      currency: 'PKR',
      takeRate: 0.06,
      ...pickStripe('AGENCY_SOLO'),
      features: [
        'Up to 3 managed brands',
        '5 team seats',
        '300 AI text / month',
        '50 AI image / month',
        'Full analytics',
      ],
      limits: {
        managedBrands: 3,
        products: 300,
        aiTextPerMonth: 300,
        aiImagePerMonth: 50,
        campaignsPerMonth: 15,
        teamSeats: 5,
        storageMb: 10000,
        knowledgeDocs: 25,
        assistantMessages: 1000,
      },
    },
    pro: {
      name: 'pro',
      role: 'AGENCY',
      label: 'Pro',
      tagline: 'For growing agencies',
      priceMonthly: 50000,
      priceYearly: 500000,
      currency: 'PKR',
      popular: true,
      takeRate: 0.04,
      ...pickStripe('AGENCY_PRO'),
      features: [
        'Up to 10 managed brands',
        '15 team seats',
        '1,500 AI text / month',
        '200 AI image / month',
        'Priority support',
      ],
      limits: {
        managedBrands: 10,
        products: 1000,
        aiTextPerMonth: 1500,
        aiImagePerMonth: 200,
        campaignsPerMonth: 50,
        teamSeats: 15,
        storageMb: 30000,
        knowledgeDocs: 75,
        assistantMessages: 5000,
      },
    },
    scale: {
      name: 'scale',
      role: 'AGENCY',
      label: 'Scale',
      tagline: 'For established agencies',
      priceMonthly: 120000,
      priceYearly: 1200000,
      currency: 'PKR',
      takeRate: 0.03,
      ...pickStripe('AGENCY_SCALE'),
      features: [
        'Up to 30 managed brands',
        '40 team seats',
        '6,000 AI text / month',
        '500 AI image / month',
        'Dedicated account manager',
      ],
      limits: {
        managedBrands: 30,
        products: 5000,
        aiTextPerMonth: 6000,
        aiImagePerMonth: 500,
        campaignsPerMonth: 200,
        teamSeats: 40,
        storageMb: 100000,
        knowledgeDocs: 200,
        assistantMessages: 20000,
      },
    },
    enterprise: {
      name: 'enterprise',
      role: 'AGENCY',
      label: 'Enterprise',
      tagline: 'Custom agency plan',
      priceMonthly: null,
      priceYearly: null,
      currency: 'PKR',
      takeRate: 0.02,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        'Unlimited brands',
        'Unlimited team',
        'Unlimited AI',
        'API access + SLA',
      ],
      limits: {
        managedBrands: null,
        products: null,
        aiTextPerMonth: null,
        aiImagePerMonth: null,
        campaignsPerMonth: null,
        teamSeats: null,
        storageMb: null,
        knowledgeDocs: null,
        assistantMessages: null,
      },
    },
  },

  // ====================================================
  // INFLUENCER plans
  // ====================================================
  INFLUENCER: {
    trial: {
      name: 'trial',
      role: 'INFLUENCER',
      label: 'Creator Trial',
      tagline: 'Full Creator access for 7 days',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'PKR',
      isTrial: true,
      trialDays: 7,
      takeRate: 0.12,
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        'Full Creator access for 7 days',
        'Unlimited applies',
        'Wallet + withdrawals',
        'Chat with brands',
      ],
      limits: {
        campaignApplies: 50,
        teamSeats: 1,
      },
    },
    free: {
      name: 'free',
      role: 'INFLUENCER',
      label: 'Free',
      tagline: 'Limited forever-free profile',
      priceMonthly: 0,
      priceYearly: 0,
      currency: 'PKR',
      isFree: true,
      takeRate: 0, // can't earn on free tier
      stripePriceIdMonthly: null,
      stripePriceIdYearly: null,
      features: [
        'Profile visible to brands',
        'Set your pricing tiers',
        '1 campaign apply / month',
        'No wallet / no withdrawals',
      ],
      limits: {
        campaignApplies: 1,
        teamSeats: 1,
      },
    },
    creator: {
      name: 'creator',
      role: 'INFLUENCER',
      label: 'Creator',
      tagline: 'For influencers getting started',
      priceMonthly: 2000,
      priceYearly: 20000,
      currency: 'PKR',
      takeRate: 0.12,
      ...pickStripe('INFLUENCER_CREATOR'),
      features: [
        'Unlimited campaign applies',
        'Wallet + withdrawals',
        'Full chat with brands',
        '1-year analytics history',
      ],
      limits: {
        campaignApplies: null,
        teamSeats: 1,
      },
    },
    pro: {
      name: 'pro',
      role: 'INFLUENCER',
      label: 'Pro',
      tagline: 'For serious creators',
      priceMonthly: 6000,
      priceYearly: 60000,
      currency: 'PKR',
      popular: true,
      takeRate: 0.09,
      ...pickStripe('INFLUENCER_PRO'),
      features: [
        'Everything in Creator',
        'Priority matching (3× visibility)',
        'Verified badge',
        'Priority support',
      ],
      limits: {
        campaignApplies: null,
        teamSeats: 1,
      },
    },
    elite: {
      name: 'elite',
      role: 'INFLUENCER',
      label: 'Elite',
      tagline: 'For top-tier creators',
      priceMonthly: 15000,
      priceYearly: 150000,
      currency: 'PKR',
      takeRate: 0.06,
      ...pickStripe('INFLUENCER_ELITE'),
      features: [
        'Everything in Pro',
        'Top of matching results',
        'Featured in Discover weekly',
        'Dedicated account manager',
      ],
      limits: {
        campaignApplies: null,
        teamSeats: 1,
      },
    },
  },
};

// ------------------------------------------------------
// Lookup helpers
// ------------------------------------------------------
function getPlan(role, name) {
  const rolePlans = PLANS[role];
  if (!rolePlans) return null;
  return rolePlans[name] || null;
}

function getPlanByFullName(fullName) {
  // fullName format: "BRAND:growth" or just "growth"
  if (fullName.includes(':')) {
    const [role, name] = fullName.split(':');
    return getPlan(role, name);
  }
  // Search across all roles
  for (const role of Object.keys(PLANS)) {
    if (PLANS[role][fullName]) return PLANS[role][fullName];
  }
  return null;
}

function listPlansForRole(role) {
  const rolePlans = PLANS[role];
  if (!rolePlans) return [];
  return Object.values(rolePlans);
}

function listAllPlans() {
  return Object.entries(PLANS).reduce((acc, [role, plans]) => {
    acc[role] = Object.values(plans);
    return acc;
  }, {});
}

function getTrialPlanForRole(role) {
  return PLANS[role]?.trial || null;
}

function getDefaultPlanForRole(role) {
  if (role === 'INFLUENCER') return PLANS.INFLUENCER.free;
  // Brands and Agencies have no free tier — trial expires → must pay
  return null;
}

module.exports = {
  PLANS,
  getPlan,
  getPlanByFullName,
  listPlansForRole,
  listAllPlans,
  getTrialPlanForRole,
  getDefaultPlanForRole,
};