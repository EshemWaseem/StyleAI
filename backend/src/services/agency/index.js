// backend/src/services/agency/index.js
const profile = require('./profile');
const context = require('./context');
const engagement = require('./engagement');
const ads = require('./ads');
const campaign = require('./campaign');
const googleCampaign = require('./googleCampaign');
const aiCampaign = require('./aiCampaign');

module.exports = {
  resolveActiveBrand: context.resolveActiveBrand,
  listAgencyClients: context.listAgencyClients,
  getMyProfile: profile.getMyProfile,
  updateProfile: profile.updateProfile,
  getProfileByOrgId: profile.getProfileByOrgId,
  getOrCreateProfile: profile.getOrCreateProfile,
  listAgenciesForService: profile.listAgenciesForService,
  createEngagement: engagement.createEngagement,
  acceptEngagement: engagement.acceptEngagement,
  rejectEngagement: engagement.rejectEngagement,
  startEngagement: engagement.startEngagement,
  completeEngagement: engagement.completeEngagement,
  cancelEngagement: engagement.cancelEngagement,
  listAgencyInbox: engagement.listAgencyInbox,
  listMyEngagements: engagement.listMyEngagements,
  getEngagement: engagement.getEngagement,
  uploadAgencyDeliverable: engagement.uploadAgencyDeliverable,
  linkEngagementToCampaign: engagement.linkEngagementToCampaign,
  listAdAccounts: ads.listAdAccounts,
  getOAuthUrl: ads.getOAuthUrl,
  handleOAuthCallback: ads.handleOAuthCallback,
  disconnectAdAccount: ads.disconnectAdAccount,
  createMetaCampaign: campaign.createMetaCampaign,
  listMetaCampaigns: campaign.listMetaCampaigns,
  toggleCampaignStatus: campaign.toggleCampaignStatus,
  createGoogleCampaign: googleCampaign.createGoogleCampaign,
  generateAdText: aiCampaign.generateAdText,
  generateAdImage: aiCampaign.generateAdImage,
  VALID_SERVICE_TYPES: profile.VALID_SERVICE_TYPES,
  BRAND_SERVICES: profile.BRAND_SERVICES,
  INFLUENCER_SERVICES: profile.INFLUENCER_SERVICES,
};