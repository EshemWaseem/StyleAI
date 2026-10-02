// controllers/billingController.js
const svc = require('../services/billing');
const prisma = require('../config/prisma');
const { httpError } = require('../services/influencer/helpers');

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

// ------------------------------------------------------
// DELETE /api/billing/invoices/:id
// Users can delete only their own FAILED invoices
// Admins can delete any FAILED/PENDING
// ------------------------------------------------------
async function deleteInvoice(req, res, next) {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({ where: { id } });
    if (!payment) throw httpError('Invoice not found', 404, 'NOT_FOUND');

    const isAdmin = req.user.roles?.includes('SUPER_ADMIN');

    // Ownership check
    if (!isAdmin) {
      if (!req.user.organizationId || payment.organizationId !== req.user.organizationId) {
        throw httpError('Forbidden', 403, 'FORBIDDEN');
      }
    }

    // Status check — only FAILED can be deleted by user
    const allowedStatuses = isAdmin ? ['FAILED', 'PENDING'] : ['FAILED'];
    if (!allowedStatuses.includes(payment.status)) {
      throw httpError(
        `Cannot delete ${payment.status} invoice. Only ${allowedStatuses.join(', ')} can be removed.`,
        400,
        'INVALID_STATUS'
      );
    }

    await prisma.payment.delete({ where: { id } });
    res.json({ success: true, id });
  } catch (e) { next(e); }
}

// ------------------------------------------------------
// DELETE /api/billing/invoices  (bulk delete all FAILED in own org)
// ------------------------------------------------------
async function deleteAllFailed(req, res, next) {
  try {
    const isAdmin = req.user.roles?.includes('SUPER_ADMIN');

    const where = { status: 'FAILED' };
    if (!isAdmin) {
      if (!req.user.organizationId) throw httpError('No organization', 403, 'NO_ORG');
      where.organizationId = req.user.organizationId;
    }

    const result = await prisma.payment.deleteMany({ where });
    res.json({ success: true, deleted: result.count });
  } catch (e) { next(e); }
}

module.exports = { getMe, getPlans, cancel, resume, deleteInvoice, deleteAllFailed };