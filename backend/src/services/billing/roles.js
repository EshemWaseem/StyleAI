// services/billing/roles.js
// ======================================================
// Determine the billing role for a user
// ======================================================

/**
 * Priority order:
 *   SUPER_ADMIN → null (no billing, full access)
 *   AGENCY      → 'AGENCY'
 *   BRAND_*     → 'BRAND'
 *   INFLUENCER  → 'INFLUENCER'
 *   else        → null
 */
function getBillingRole(user) {
  if (!user?.roles?.length) return null;
  if (user.roles.includes('SUPER_ADMIN')) return null; // bypass
  if (user.roles.includes('AGENCY')) return 'AGENCY';
  if (user.roles.includes('BRAND_OWNER') || user.roles.includes('BRAND_TEAM_MEMBER')) return 'BRAND';
  if (user.roles.includes('INFLUENCER')) return 'INFLUENCER';
  return null;
}

/**
 * Which identity should hold the subscription?
 *   BRAND/AGENCY  → organizationId
 *   INFLUENCER    → userId
 */
function getSubscriptionIdentity(user, role) {
  if (role === 'INFLUENCER') {
    return { role: 'INFLUENCER', userId: user.id, organizationId: null };
  }
  return { role, organizationId: user.organizationId, userId: null };
}

module.exports = { getBillingRole, getSubscriptionIdentity };