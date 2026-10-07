// services/agency/index.js
// ======================================================
// Agency service — barrel export
// ======================================================

const profile = require('./profile');
const context = require('./context');
const engagement = require('./engagement');

module.exports = {
  // ======================================================
  // Context
  // ======================================================
  resolveActiveBrand: context.resolveActiveBrand,
  listAgencyClients: context.listAgencyClients,

  // ======================================================
  // Profile
  // ======================================================
  getMyProfile: profile.getMyProfile,
  updateProfile: profile.updateProfile,
  getProfileByOrgId: profile.getProfileByOrgId,
  getOrCreateProfile: profile.getOrCreateProfile,
  listAgenciesForService: profile.listAgenciesForService,

  // ======================================================
  // Engagement — hire flow
  // ======================================================
  createEngagement: engagement.createEngagement,
  acceptEngagement: engagement.acceptEngagement,
  rejectEngagement: engagement.rejectEngagement,
  startEngagement: engagement.startEngagement,
  completeEngagement: engagement.completeEngagement,
  cancelEngagement: engagement.cancelEngagement,
  listAgencyInbox: engagement.listAgencyInbox,
  listMyEngagements: engagement.listMyEngagements,
  getEngagement: engagement.getEngagement,

  // ======================================================
  // Deliverable bridge (agency → influencer → campaign)
  // ======================================================
  uploadAgencyDeliverable: engagement.uploadAgencyDeliverable,
  linkEngagementToCampaign: engagement.linkEngagementToCampaign,

  // ======================================================
  // Constants
  // ======================================================
  VALID_SERVICE_TYPES: profile.VALID_SERVICE_TYPES,
  BRAND_SERVICES: profile.BRAND_SERVICES,
  INFLUENCER_SERVICES: profile.INFLUENCER_SERVICES,
};