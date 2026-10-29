// backend/src/controllers/adminController.js
const admin = require('../services/admin');
const ai = require('../services/ai');
const prisma = require('../config/prisma');
const approval = require('../services/admin/approval');

// ─── Dashboard ───
async function dashboard(req, res, next) {
  try { res.json({ success: true, data: await admin.getPlatformStats(req.user) }); }
  catch (err) { next(err); }
}

// ─── Users ───
async function listUsers(req, res, next) {
  try { res.json(await admin.listUsers(req.user, req.query)); }
  catch (err) { next(err); }
}
async function getUser(req, res, next) {
  try { res.json({ user: await admin.getUser(req.user, req.params.userId) }); }
  catch (err) { next(err); }
}
async function activateUser(req, res, next) {
  try { res.json({ message: 'User activated', user: await admin.setUserActive(req.user, req.params.userId, true, req) }); }
  catch (err) { next(err); }
}
async function deactivateUser(req, res, next) {
  try { res.json({ message: 'User deactivated', user: await admin.setUserActive(req.user, req.params.userId, false, req) }); }
  catch (err) { next(err); }
}
async function deleteUser(req, res, next) {
  try { res.json({ message: 'User deleted', ...(await admin.deleteUser(req.user, req.params.userId, req)) }); }
  catch (err) { next(err); }
}
async function changeUserRole(req, res, next) {
  try {
    const { roleName } = req.body || {};
    res.json({ message: 'Role updated', user: await admin.changeUserRole(req.user, req.params.userId, roleName, req) });
  } catch (err) { next(err); }
}

// ─── Admin approval (PENDING signups) ───
async function listPendingApprovals(req, res, next) {
  try {
    const users = await approval.listPending(req.user, req.query);
    res.json({ count: users.length, users });
  } catch (err) { next(err); }
}

async function approveUser(req, res, next) {
  try {
    const user = await approval.approve(req.user, req.params.userId, req);
    res.json({ message: 'User approved', user });
  } catch (err) { next(err); }
}

async function rejectUser(req, res, next) {
  try {
    const user = await approval.reject(
      req.user,
      req.params.userId,
      req.body?.reason,
      req
    );
    res.json({ message: 'User rejected', user });
  } catch (err) { next(err); }
}

// ─── Brands ───
async function listBrands(req, res, next) {
  try { res.json(await admin.listBrands(req.user, req.query)); }
  catch (err) { next(err); }
}
async function deleteBrand(req, res, next) {
  try { res.json({ message: 'Brand deleted', ...(await admin.deleteBrand(req.user, req.params.brandId, req)) }); }
  catch (err) { next(err); }
}

// ─── Influencers ───
async function listInfluencers(req, res, next) {
  try { res.json(await admin.listInfluencers(req.user, req.query)); }
  catch (err) { next(err); }
}
async function updateInfluencerStatus(req, res, next) {
  try {
    const { status } = req.body || {};
    res.json({ message: 'Status updated', influencer: await admin.updateInfluencerStatus(req.user, req.params.influencerId, status, req) });
  } catch (err) { next(err); }
}
async function deleteInfluencer(req, res, next) {
  try { res.json({ message: 'Influencer deleted', ...(await admin.deleteInfluencer(req.user, req.params.influencerId, req)) }); }
  catch (err) { next(err); }
}

// ─── Agencies ───
async function listAgencies(req, res, next) {
  try { res.json(await admin.listAgencies(req.user, req.query)); }
  catch (err) { next(err); }
}

// ─── Products ───
async function listProducts(req, res, next) {
  try { res.json(await admin.listProducts(req.user, req.query)); }
  catch (err) { next(err); }
}
async function deleteProduct(req, res, next) {
  try { res.json({ message: 'Product deleted', ...(await admin.deleteProduct(req.user, req.params.productId, req)) }); }
  catch (err) { next(err); }
}

// ─── Campaigns ───
async function listCampaigns(req, res, next) {
  try { res.json(await admin.listCampaigns(req.user, req.query)); }
  catch (err) { next(err); }
}

// ─── Campaign Requests ───
async function createCampaignRequest(req, res, next) {
  try {
    const { brandId, title, description, budget } = req.body;
    if (!brandId || !title) {
      return res.status(400).json({ message: 'brandId and title are required' });
    }
    const request = await prisma.adminCampaignRequest.create({
      data: {
        adminId: req.user.id,
        brandId,
        title,
        description,
        budget: budget ? parseFloat(budget) : null,
      }
    });
    res.status(201).json({ message: 'Request sent successfully', request });
  } catch (err) { next(err); }
}

async function listCampaignRequests(req, res, next) {
  try {
    const requests = await prisma.adminCampaignRequest.findMany({
      include: { brand: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' }
    });
    res.json({ requests });
  } catch (err) { next(err); }
}

// ─── Payments ───
async function listPayments(req, res, next) {
  try { res.json(await admin.listPayments(req.user, req.query)); }
  catch (err) { next(err); }
}

// ─── Finance ───
async function getFinanceRules(req, res, next) {
  try { res.json({ rules: await admin.getFinanceRules() }); }
  catch (err) { next(err); }
}
async function updateFinanceRules(req, res, next) {
  try { res.json({ message: 'Finance rules updated', rules: await admin.updateFinanceRules(req.user.id, req.body) }); }
  catch (err) { next(err); }
}

// ─── Settings ───
async function getAllSettings(req, res, next) {
  try { res.json({ settings: await admin.getAllSettingsGrouped() }); }
  catch (err) { next(err); }
}
async function updateSettings(req, res, next) {
  try { res.json({ message: 'Settings updated', updated: await admin.updateSettings(req.user.id, req.body) }); }
  catch (err) { next(err); }
}

// ─── Audit ───
async function listAuditLogs(req, res, next) {
  try { res.json(await admin.listAuditLogs(req.query)); }
  catch (err) { next(err); }
}

// ─── AI ───
async function getAIStats(req, res, next) {
  try { res.json({ stats: await ai.getUsageStats({ sinceHours: Number(req.query.sinceHours) || 24 }) }); }
  catch (err) { next(err); }
}
async function getAITimeline(req, res, next) {
  try { res.json({ timeline: await ai.getUsageTimeline({ days: Number(req.query.days) || 7 }) }); }
  catch (err) { next(err); }
}
async function listAIUsage(req, res, next) {
  try {
    res.json(await ai.listRecentUsage({
      limit: req.query.limit, offset: req.query.offset,
      provider: req.query.provider, status: req.query.status,
    }));
  } catch (err) { next(err); }
}
async function listAIModels(req, res, next) {
  try {
    res.json({ models: await ai.listModels({
      taskType: req.query.taskType, provider: req.query.provider, status: req.query.status,
    }) });
  } catch (err) { next(err); }
}
async function getAIModel(req, res, next) {
  try { res.json({ model: await ai.getModel(req.params.id) }); }
  catch (err) { next(err); }
}
async function createAIModel(req, res, next) {
  try { res.status(201).json({ message: 'Model created', model: await ai.createModel(req.user, req.body) }); }
  catch (err) { next(err); }
}
async function updateAIModel(req, res, next) {
  try { res.json({ message: 'Model updated', model: await ai.updateModel(req.user, req.params.id, req.body) }); }
  catch (err) { next(err); }
}
async function deleteAIModel(req, res, next) {
  try { res.json({ message: 'Model deleted', ...(await ai.deleteModel(req.user, req.params.id)) }); }
  catch (err) { next(err); }
}

module.exports = {
  dashboard,
  listUsers, getUser, activateUser, deactivateUser, deleteUser, changeUserRole,
  listPendingApprovals, approveUser, rejectUser,
  listBrands, deleteBrand,
  listInfluencers, updateInfluencerStatus, deleteInfluencer,
  listAgencies,
  listProducts, deleteProduct,
  listCampaigns,
  createCampaignRequest,
  listCampaignRequests,
  listPayments,
  getFinanceRules,
  updateFinanceRules,
  getAllSettings,
  updateSettings,
  listAuditLogs,

  // AI
  getAIStats, getAITimeline, listAIUsage,
  listAIModels, getAIModel,
  createAIModel, updateAIModel, deleteAIModel,
};