// controllers/billingController.js
const svc = require('../services/billing');
const { listPlans } = require('../services/billing/plans');

async function getMe(req, res, next) {
  try { res.json(await svc.getMyBilling(req.user)); }
  catch (e) { next(e); }
}

async function getPlans(req, res, next) {
  try { res.json({ plans: listPlans() }); }
  catch (e) { next(e); }
}

// upgrade() REMOVED — checkout handled by POST /api/payments/subscription/checkout

async function cancel(req, res, next) {
  try { res.json({ subscription: await svc.cancelSubscription(req.user) }); }
  catch (e) { next(e); }
}

async function resume(req, res, next) {
  try { res.json({ subscription: await svc.resumeSubscription(req.user) }); }
  catch (e) { next(e); }
}

module.exports = { getMe, getPlans, cancel, resume };