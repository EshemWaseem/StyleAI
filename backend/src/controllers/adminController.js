// backend/src/controllers/adminController.js
const admin = require('../services/admin');
const ai = require('../services/ai');

// ---------- Dashboard ----------
async function dashboard(req, res, next) {
  try { res.json({ success: true, data: await admin.getPlatformStats(req.user) }); }
  catch (err) { next(err); }
}

// ---------- Users ----------
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

// ---------- Brands ----------
async function listBrands(req, res, next) {
  try { res.json(await admin.listBrands(req.user, req.query)); }
  catch (err) { next(err); }
}
async function deleteBrand(req, res, next) {
  try { res.json({ message: 'Brand deleted', ...(await admin.deleteBrand(req.user, req.params.brandId, req)) }); }
  catch (err) { next(err); }
}

// ---------- Influencers ----------
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

// ---------- Agencies ----------
async function listAgencies(req, res, next) {
  try { res.json(await admin.listAgencies(req.user, req.query)); }
  catch (err) { next(err); }
}

// ---------- Products ----------
async function listProducts(req, res, next) {
  try { res.json(await admin.listProducts(req.user, req.query)); }
  catch (err) { next(err); }
}
async function deleteProduct(req, res, next) {
  try { res.json({ message: 'Product deleted', ...(await admin.deleteProduct(req.user, req.params.productId, req)) }); }
  catch (err) { next(err); }
}

// ---------- Campaigns ----------
async function listCampaigns(req, res, next) {
  try { res.json(await admin.listCampaigns(req.user, req.query)); }
  catch (err) { next(err); }
}

// ---------- Payments ----------
async function listPayments(req, res, next) {
  try { res.json(await admin.listPayments(req.user, req.query)); }
  catch (err) { next(err); }
}

// ======================================================
// FINANCE
// ======================================================
async function getFinanceRules(req, res, next) {
  try {
    const rules = await admin.getFinanceRules();
    res.json({ rules });
  } catch (err) { next(err); }
}

async function updateFinanceRules(req, res, next) {
  try {
    const rules = await admin.updateFinanceRules(req.user.id, req.body);
    res.json({ message: 'Finance rules updated', rules });
  } catch (err) { next(err); }
}

// ======================================================
// SETTINGS
// ======================================================
async function getAllSettings(req, res, next) {
  try {
    const settings = await admin.getAllSettingsGrouped();
    res.json({ settings });
  } catch (err) { next(err); }
}

async function updateSettings(req, res, next) {
  try {
    const updated = await admin.updateSettings(req.user.id, req.body);
    res.json({ message: 'Settings updated', updated });
  } catch (err) { next(err); }
}

// ======================================================
// AUDIT
// ======================================================
async function listAuditLogs(req, res, next) {
  try {
    const result = await admin.listAuditLogs(req.query);
    res.json(result);
  } catch (err) { next(err); }
}

// ======================================================
// AI — Model Management Dashboard (SRS §48-49)
// ======================================================
async function getAIStats(req, res, next) {
  try {
    const sinceHours = Number(req.query.sinceHours) || 24;
    const stats = await ai.getUsageStats({ sinceHours });
    res.json({ stats });
  } catch (err) { next(err); }
}

async function getAITimeline(req, res, next) {
  try {
    const days = Number(req.query.days) || 7;
    const timeline = await ai.getUsageTimeline({ days });
    res.json({ timeline });
  } catch (err) { next(err); }
}

async function listAIUsage(req, res, next) {
  try {
    const result = await ai.listRecentUsage({
      limit: req.query.limit,
      offset: req.query.offset,
      provider: req.query.provider,
      status: req.query.status,
    });
    res.json(result);
  } catch (err) { next(err); }
}

async function listAIModels(req, res, next) {
  try {
    const models = await ai.listModels({
      taskType: req.query.taskType,
      provider: req.query.provider,
      status: req.query.status,
    });
    res.json({ models });
  } catch (err) { next(err); }
}

async function getAIModel(req, res, next) {
  try {
    const model = await ai.getModel(req.params.id);
    res.json({ model });
  } catch (err) { next(err); }
}

async function createAIModel(req, res, next) {
  try {
    const model = await ai.createModel(req.user, req.body);
    res.status(201).json({ message: 'Model created', model });
  } catch (err) { next(err); }
}

async function updateAIModel(req, res, next) {
  try {
    const model = await ai.updateModel(req.user, req.params.id, req.body);
    res.json({ message: 'Model updated', model });
  } catch (err) { next(err); }
}

async function deleteAIModel(req, res, next) {
  try {
    const result = await ai.deleteModel(req.user, req.params.id);
    res.json({ message: 'Model deleted', ...result });
  } catch (err) { next(err); }
}

module.exports = {
  dashboard,
  listUsers, getUser, activateUser, deactivateUser, deleteUser, changeUserRole,
  listBrands, deleteBrand,
  listInfluencers, updateInfluencerStatus, deleteInfluencer,
  listAgencies,
  listProducts, deleteProduct,
  listCampaigns,
  listPayments,
  getFinanceRules,
  updateFinanceRules,
  getAllSettings,
  updateSettings,
  listAuditLogs,

  // AI (SRS §48-49)
  getAIStats,
  getAITimeline,
  listAIUsage,
  listAIModels,
  getAIModel,
  createAIModel,
  updateAIModel,
  deleteAIModel,
};