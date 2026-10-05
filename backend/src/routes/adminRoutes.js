// adminRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(authenticate, authorize('SUPER_ADMIN'));

// ======================================================
// DASHBOARD
// ======================================================
router.get('/dashboard', ctrl.dashboard);

// ======================================================
// USERS
// ======================================================
router.get('/users', ctrl.listUsers);
router.get('/users/:userId', ctrl.getUser);
router.patch('/users/:userId/activate', ctrl.activateUser);
router.patch('/users/:userId/deactivate', ctrl.deactivateUser);
router.patch('/users/:userId/role', ctrl.changeUserRole);
router.delete('/users/:userId', ctrl.deleteUser);

// ======================================================
// BRANDS
// ======================================================
router.get('/brands', ctrl.listBrands);
router.delete('/brands/:brandId', ctrl.deleteBrand);

// ======================================================
// INFLUENCERS
// ======================================================
router.get('/influencers', ctrl.listInfluencers);
router.patch('/influencers/:influencerId/status', ctrl.updateInfluencerStatus);
router.delete('/influencers/:influencerId', ctrl.deleteInfluencer);

// ======================================================
// AGENCIES
// ======================================================
router.get('/agencies', ctrl.listAgencies);

// ======================================================
// PRODUCTS
// ======================================================
router.get('/products', ctrl.listProducts);
router.delete('/products/:productId', ctrl.deleteProduct);

// ======================================================
// CAMPAIGNS
// ======================================================
router.get('/campaigns', ctrl.listCampaigns);

// ======================================================
// PAYMENTS
// ======================================================
router.get('/payments', ctrl.listPayments);

// ======================================================
// FINANCE RULES
// ======================================================
router.get('/finance', ctrl.getFinanceRules);
router.patch('/finance', ctrl.updateFinanceRules);

// ======================================================
// PLATFORM SETTINGS
// ======================================================
router.get('/settings', ctrl.getAllSettings);
router.patch('/settings', ctrl.updateSettings);

// ======================================================
// AUDIT LOGS
// ======================================================
router.get('/audit', ctrl.listAuditLogs);

// ======================================================
// AI — Model Management Dashboard (SRS §48-49)
// ======================================================
router.get('/ai/stats', ctrl.getAIStats);
router.get('/ai/timeline', ctrl.getAITimeline);
router.get('/ai/usage', ctrl.listAIUsage);
router.get('/ai/models', ctrl.listAIModels);
router.get('/ai/models/:id', ctrl.getAIModel);
router.post('/ai/models', ctrl.createAIModel);
router.patch('/ai/models/:id', ctrl.updateAIModel);
router.delete('/ai/models/:id', ctrl.deleteAIModel);

module.exports = router;