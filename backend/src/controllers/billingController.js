// controllers/billingController.js
const svc = require('../services/billing');

async function getMe(req, res, next) {
  try { res.json(await svc.getMyBilling(req.user)); }
  catch (e) { next(e); }
}

async function getPlans(req, res, next) {
  try {
    const role = (req.query.role || '').toString().toUpperCase();
    const allowed = ['BRAND', 'AGENCY', 'INFLUENCER'];
    if (role && !allowed.includes(role)) {
      return res.status(400).json({ message: `role must be one of ${allowed.join(', ')}` });
    }
    res.json({ plans: svc.listPlans(role || null) });
  } catch (e) { next(e); }
}

async function cancel(req, res, next) {
  try { res.json({ subscription: await svc.cancelSubscription(req.user) }); }
  catch (e) { next(e); }
}

async function resume(req, res, next) {
  try { res.json({ subscription: await svc.resumeSubscription(req.user) }); }
  catch (e) { next(e); }
}

module.exports = { getMe, getPlans, cancel, resume };