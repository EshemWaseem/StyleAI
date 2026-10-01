// controllers/analyticsController.js
const svc = require('../services/analytics');
const { httpError } = require('../services/influencer/helpers');

async function platform(req, res, next) {
  try {
    const data = await svc.getPlatformAnalytics();
    res.json(data);
  } catch (e) { next(e); }
}

async function brand(req, res, next) {
  try {
    if (!req.user.organizationId) throw httpError('No organization linked', 403);
    const data = await svc.getBrandAnalytics(req.user.organizationId);
    res.json(data);
  } catch (e) { next(e); }
}

async function agency(req, res, next) {
  try {
    if (!req.user.roles?.includes('AGENCY')) throw httpError('Agency access required', 403);
    const data = await svc.getAgencyAnalytics(req.user.organizationId);
    res.json(data);
  } catch (e) { next(e); }
}

async function influencer(req, res, next) {
  try {
    const data = await svc.getInfluencerAnalytics(req.user);
    if (!data) throw httpError('No influencer profile linked', 404);
    res.json(data);
  } catch (e) { next(e); }
}

module.exports = { platform, brand, agency, influencer };