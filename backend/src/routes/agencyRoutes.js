// backend/src/routes/agencyRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const agency = require('../services/agency');
const agencyCampaign = require('../services/agency/aiCampaign'); 

function frontendBase() {
  return (process.env.FRONTEND_URL || 'http://localhost:3000').split(',')[0].trim();
}

router.get('/integrations/:provider/callback', async (req, res) => {
  const provider = String(req.params.provider || '').toUpperCase();
  const base = frontendBase();

  function redirect(success, extra = {}) {
    const url = new URL(`${base}/agency`);
    url.searchParams.set('connected', success ? 'true' : 'false');
    url.searchParams.set('provider', provider);
    for (const [k, v] of Object.entries(extra)) {
      if (v) url.searchParams.set(k, String(v).slice(0, 200));
    }
    return res.redirect(302, url.toString());
  }

  const { code, state, error, error_reason, error_description } = req.query;

  if (error) return redirect(false, { error: error_description || error_reason || error });
  if (!code || !state) return redirect(false, { error: 'missing_code_or_state' });

  try {
    await agency.handleOAuthCallback(provider, String(code), String(state));
    return redirect(true);
  } catch (err) {
    console.error(`[agency/${provider}/callback]`, err.message);
    return redirect(false, { error: err.message || 'callback_failed' });
  }
});

router.use(authenticate);

router.get('/me/profile', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const profile = await agency.getMyProfile(req.user);
    res.json({ profile });
  } catch (err) { next(err); }
});

router.patch('/me/profile', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const profile = await agency.updateProfile(req.user, req.body);
    res.json({ message: 'Profile updated', profile });
  } catch (err) { next(err); }
});

router.get('/browse', authorize('BRAND_OWNER', 'BRAND_TEAM_MEMBER', 'INFLUENCER', 'AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const agencies = await agency.listAgenciesForService({
      serviceType: req.query.serviceType,
      serviceGroup: req.query.serviceGroup,  
      limit: req.query.limit,
    });
    res.json({ agencies });
  } catch (err) { next(err); }
});

router.get('/clients', async (req, res, next) => {
  try {
    const clients = await agency.listAgencyClients(req.user);
    res.json({ clients });
  } catch (err) { next(err); }
});

router.get('/service-types', (req, res) => {
  res.json({
    all: agency.VALID_SERVICE_TYPES,
    brandSide: agency.BRAND_SERVICES,
    influencerSide: agency.INFLUENCER_SERVICES,
  });
});

router.get('/integrations', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const accounts = await agency.listAdAccounts(req.user);
    res.json({ accounts });
  } catch (err) { next(err); }
});

router.get('/integrations/:provider/connect', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const url = await agency.getOAuthUrl(req.user, req.params.provider.toUpperCase());
    res.json({ url });
  } catch (err) { next(err); }
});

router.delete('/integrations/:provider', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    await agency.disconnectAdAccount(req.user, req.params.provider.toUpperCase());
    res.json({ message: 'Disconnected' });
  } catch (err) { next(err); }
});

router.post('/meta-campaigns', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.createMetaCampaign(req.user, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/google-campaigns', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.createGoogleCampaign(req.user, req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/meta-campaigns', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.listMetaCampaigns(req.user);
    res.json(result);
  } catch (err) { next(err); }
});

router.patch('/meta-campaigns/:id/status', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await agency.toggleCampaignStatus(req.user, req.params.id, status);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/meta-campaigns/generate-text', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.generateAdText(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/meta-campaigns/generate-image', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.generateAdImage(req.body);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/engagements/inbox', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.listAgencyInbox(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

router.get('/engagements/mine', async (req, res, next) => {
  try {
    const result = await agency.listMyEngagements(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/engagements', async (req, res, next) => {
  try {
    const engagement = await agency.createEngagement(req.user, req.body);
    res.status(201).json({ message: 'Engagement requested', engagement });
  } catch (err) { next(err); }
});

router.get('/engagements/:id', async (req, res, next) => {
  try {
    const engagement = await agency.getEngagement(req.user, req.params.id);
    res.json({ engagement });
  } catch (err) { next(err); }
});

router.get('/meta-campaigns/:id/insights', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.getMetaCampaignInsights(req.user, req.params.id);
    res.json(result);
  } catch (err) { next(err); }
});

router.post('/engagements/:id/accept', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.acceptEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement accepted', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/reject', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.rejectEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement declined', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/start', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.startEngagement(req.user, req.params.id);
    res.json({ message: 'Engagement started', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/complete', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.completeEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement completed', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/cancel', async (req, res, next) => {
  try {
    const engagement = await agency.cancelEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement cancelled', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/deliverable', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.uploadAgencyDeliverable(req.user, req.params.id, req.body);
    res.json({ message: 'Deliverable uploaded', engagement });
  } catch (err) { next(err); }
});

router.post('/engagements/:id/link', async (req, res, next) => {
  try {
    const engagement = await agency.linkEngagementToCampaign(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement linked', engagement });
  } catch (err) { next(err); }
});

router.post('/meta-campaigns/generate-strategy', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agencyCampaign.generateCampaignStrategy(req.body);
    res.json(result);
  } catch (err) { 
    next(err); 
  }
});

module.exports = router;