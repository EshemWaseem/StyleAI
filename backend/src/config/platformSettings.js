// platform settings.js

/**
 * Platform-wide settings defaults.
 * Admin can override these via the PlatformSetting table.
 */

module.exports = {
  // ---------- Finance ----------
  // finance: {
  //   brandCommissionPct: 2,
  //   influencerCommissionPct: 2,
  //   bulkDiscountThreshold: 5,
  //   bulkDiscountPct: 30,
  //   influencerBonusThreshold: 10,
  //   influencerBonusPct: 5,
  //   currency: "USD",
  // },
    // ---------- Finance ----------
  // Dual-commission model (Upwork-style):
  //   Brand pays $1000
  //   Brand-side fee (5%)    → platform earns $50
  //   Subtotal                → $950
  //   Influencer fee (5% of $950) → platform earns $47.50
  //   Influencer receives    → $902.50
  //   Total platform revenue → $97.50
  // All values are ADMIN-EDITABLE via PlatformSetting table.
  finance: {
    // Dual commission
    brandCommissionPct: 5,          // charged to brand on top of subtotal
    influencerCommissionPct: 5,     // deducted from influencer payout

    // Legacy field (kept for backward compat with existing offers)
    // Do NOT delete — existing offers reference this in their frozen adminFeePct.
    // New offers should use brandCommissionPct.
    // NOTE: adminFeePct on offers is now an alias for brandCommissionPct.

    // Bulk discount (brand side)
    bulkDiscountThreshold: 5,
    bulkDiscountPct: 30,

    // Bonus (influencer side, future)
    influencerBonusThreshold: 10,
    influencerBonusPct: 5,

    // Payout controls
    minWithdrawalAmount: 50,        // must be >= this to withdraw
    payoutHoldDays: 7,              // escrow → wallet wait time

    // Display
    currency: "USD",
  },

  // ---------- Limits ----------
  limits: {
    maxProductImages: 5,
    maxImageSizeMb: 5,
    maxCampaignsPerBrand: 50,
    maxPortfolioItems: 20,
  },

  // ---------- Feature flags ----------
  features: {
    enableAIMatching: true,
    enableImageGeneration: false,
    enableSocialIntegration: false,
    enableInfluencerSelfSignup: true,
  },
};