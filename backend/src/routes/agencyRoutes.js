// backend/src/routes/agencyRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const agency = require('../services/agency');

router.use(authenticate);

// ======================================================
// AGENCY PROFILE
// ======================================================
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

// ======================================================
// AGENCY DIRECTORY
// ======================================================
router.get(
  '/browse',
  authorize('BRAND_OWNER', 'BRAND_TEAM_MEMBER', 'INFLUENCER', 'AGENCY', 'SUPER_ADMIN'),
  async (req, res, next) => {
    try {
      const agencies = await agency.listAgenciesForService({
        serviceType: req.query.serviceType,
        serviceGroup: req.query.serviceGroup,   // ✅ NEW: "BRAND" | "INFLUENCER"
        limit: req.query.limit,
      });
      res.json({ agencies });
    } catch (err) { next(err); }
  }
);

// ======================================================
// CLIENTS (existing)
// ======================================================
router.get('/clients', async (req, res, next) => {
  try {
    const clients = await agency.listAgencyClients(req.user);
    res.json({ clients });
  } catch (err) { next(err); }
});

// ======================================================
// SERVICE TYPE CATALOG
// ======================================================
router.get('/service-types', (req, res) => {
  res.json({
    all: agency.VALID_SERVICE_TYPES,
    brandSide: agency.BRAND_SERVICES,
    influencerSide: agency.INFLUENCER_SERVICES,
  });
});

// ======================================================
// ENGAGEMENTS — HIRE FLOW
// ======================================================

// Agency inbox — received requests
router.get('/engagements/inbox', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const result = await agency.listAgencyInbox(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

// Client — sent requests
router.get('/engagements/mine', async (req, res, next) => {
  try {
    const result = await agency.listMyEngagements(req.user, req.query);
    res.json(result);
  } catch (err) { next(err); }
});

// Client — create request
router.post('/engagements', async (req, res, next) => {
  try {
    const engagement = await agency.createEngagement(req.user, req.body);
    res.status(201).json({ message: 'Engagement requested', engagement });
  } catch (err) { next(err); }
});

// Get one
router.get('/engagements/:id', async (req, res, next) => {
  try {
    const engagement = await agency.getEngagement(req.user, req.params.id);
    res.json({ engagement });
  } catch (err) { next(err); }
});

// Agency — accept
router.post('/engagements/:id/accept', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.acceptEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement accepted', engagement });
  } catch (err) { next(err); }
});

// Agency — reject
router.post('/engagements/:id/reject', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.rejectEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement declined', engagement });
  } catch (err) { next(err); }
});

// Agency — start
router.post('/engagements/:id/start', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.startEngagement(req.user, req.params.id);
    res.json({ message: 'Engagement started', engagement });
  } catch (err) { next(err); }
});

// Agency — complete
router.post('/engagements/:id/complete', authorize('AGENCY', 'SUPER_ADMIN'), async (req, res, next) => {
  try {
    const engagement = await agency.completeEngagement(req.user, req.params.id, req.body);
    res.json({ message: 'Engagement completed', engagement });
  } catch (err) { next(err); }
});

// Client — cancel
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

module.exports = router;