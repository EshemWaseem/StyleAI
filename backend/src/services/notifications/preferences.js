// services/notifications/preferences.js
// ======================================================
// Notification preferences — email categories + unsubscribe tokens.
// Auto-creates on first access (backward compatible).
// ======================================================

const prisma = require('../../config/prisma');

const CATEGORIES = ['TRIAL', 'OFFERS', 'CAMPAIGNS', 'WALLET', 'PAYMENTS', 'SYSTEM'];

// Template → category mapping
const TEMPLATE_CATEGORY = {
  welcome: 'TRIAL',
  trialExpiring: 'TRIAL',
  trialExpired: 'TRIAL',

  offerReceived: 'OFFERS',
  offerAccepted: 'OFFERS',
  offerDeclined: 'OFFERS',

  contentSubmitted: 'CAMPAIGNS',
  contentApproved: 'CAMPAIGNS',

  paymentReceipt: 'PAYMENTS',

  withdrawalRequested: 'WALLET',
  withdrawalReviewed: 'WALLET',
};

const FIELD_MAP = {
  TRIAL: 'emailTrial',
  OFFERS: 'emailOffers',
  CAMPAIGNS: 'emailCampaigns',
  WALLET: 'emailWallet',
  PAYMENTS: 'emailPayments',
  SYSTEM: 'emailSystem',
};

/**
 * Get or create the user's preferences.
 */
async function getPreferences(userId) {
  if (!userId) return null;

  let prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });

  if (!prefs) {
    prefs = await prisma.notificationPreference.create({
      data: { userId },
    });
  }

  return shapePreferences(prefs);
}

/**
 * Update email preferences.
 */
async function updatePreferences(userId, updates = {}) {
  if (!userId) throw new Error('userId required');

  // Ensure row exists
  await getPreferences(userId);

  const data = {};
  for (const [key, value] of Object.entries(updates)) {
    if (key.startsWith('email') && typeof value === 'boolean') {
      data[key] = value;
    }
  }

  const prefs = await prisma.notificationPreference.update({
    where: { userId },
    data,
  });

  return shapePreferences(prefs);
}

/**
 * Check if user has email enabled for a category.
 * Defaults to true if user/prefs missing.
 */
async function isEmailEnabled(userId, category) {
  if (!userId || !category) return true;
  const field = FIELD_MAP[category];
  if (!field) return true;

  try {
    const prefs = await prisma.notificationPreference.findUnique({
      where: { userId },
      select: { [field]: true },
    });
    // Missing row → treat as enabled (backward compatible)
    if (!prefs) return true;
    return prefs[field] === true;
  } catch (err) {
    console.error('[notif.prefs] isEmailEnabled failed:', err.message);
    return true; // fail open
  }
}

/**
 * Get (or create) the user's unsubscribe token.
 */
async function getUnsubscribeToken(userId) {
  const prefs = await getPreferences(userId);
  return prefs?.unsubscribeToken || null;
}

/**
 * Map template name → category. Returns null if unknown.
 */
function categoryForTemplate(templateName) {
  return TEMPLATE_CATEGORY[templateName] || null;
}

/**
 * Unsubscribe by token (public — no auth).
 * category: one of CATEGORIES, or "ALL" to disable all.
 */
async function unsubscribeByToken(token, category = 'ALL') {
  if (!token) throw new Error('token required');

  const prefs = await prisma.notificationPreference.findUnique({
    where: { unsubscribeToken: token },
  });
  if (!prefs) return { ok: false, reason: 'INVALID_TOKEN' };

  const data = {};
  if (category === 'ALL') {
    for (const field of Object.values(FIELD_MAP)) data[field] = false;
  } else if (FIELD_MAP[category]) {
    data[FIELD_MAP[category]] = false;
  } else {
    return { ok: false, reason: 'INVALID_CATEGORY' };
  }

  await prisma.notificationPreference.update({
    where: { unsubscribeToken: token },
    data,
  });

  return { ok: true, category };
}

function shapePreferences(p) {
  return {
    emailTrial: p.emailTrial,
    emailOffers: p.emailOffers,
    emailCampaigns: p.emailCampaigns,
    emailWallet: p.emailWallet,
    emailPayments: p.emailPayments,
    emailSystem: p.emailSystem,
    unsubscribeToken: p.unsubscribeToken,
    updatedAt: p.updatedAt,
  };
}

module.exports = {
  CATEGORIES,
  getPreferences,
  updatePreferences,
  isEmailEnabled,
  getUnsubscribeToken,
  categoryForTemplate,
  unsubscribeByToken,
};