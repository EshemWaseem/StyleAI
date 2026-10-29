// backend/src/routes/adminRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const storefront = require('../controllers/adminStorefrontController');
const orders = require('../controllers/adminOrderController');

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/dashboard', ctrl.dashboard);

// ─── Admin approvals — MUST be before /users/:userId ───
router.get('/users/pending-approvals', ctrl.listPendingApprovals);
router.patch('/users/:userId/approve', ctrl.approveUser);
router.patch('/users/:userId/reject', ctrl.rejectUser);

// Users
router.get('/users', ctrl.listUsers);
router.get('/users/:userId', ctrl.getUser);
router.patch('/users/:userId/activate', ctrl.activateUser);
router.patch('/users/:userId/deactivate', ctrl.deactivateUser);
router.patch('/users/:userId/role', ctrl.changeUserRole);
router.delete('/users/:userId', ctrl.deleteUser);

// Brands
router.get('/brands', ctrl.listBrands);
router.delete('/brands/:brandId', ctrl.deleteBrand);

// Influencers
router.get('/influencers', ctrl.listInfluencers);
router.patch('/influencers/:influencerId/status', ctrl.updateInfluencerStatus);
router.delete('/influencers/:influencerId', ctrl.deleteInfluencer);

// Agencies
router.get('/agencies', ctrl.listAgencies);

// Products
router.get('/products', ctrl.listProducts);
router.delete('/products/:productId', ctrl.deleteProduct);

// Campaigns
router.get('/campaigns', ctrl.listCampaigns);
router.post('/campaign-requests', ctrl.createCampaignRequest);
router.get('/campaign-requests', ctrl.listCampaignRequests);

// Payments
router.get('/payments', ctrl.listPayments);

// Orders
router.get('/orders', orders.listOrders);
router.get('/orders/:orderId', orders.getOrder);
router.post('/orders/:orderId/confirm-delivery', orders.confirmDelivery);
router.post('/orders/:orderId/cancel', orders.cancelOrder);

// Finance
router.get('/finance', ctrl.getFinanceRules);
router.patch('/finance', ctrl.updateFinanceRules);

// Settings
router.get('/settings', ctrl.getAllSettings);
router.patch('/settings', ctrl.updateSettings);

// Audit
router.get('/audit', ctrl.listAuditLogs);

// AI
router.get('/ai/stats', ctrl.getAIStats);
router.get('/ai/timeline', ctrl.getAITimeline);
router.get('/ai/usage', ctrl.listAIUsage);
router.get('/ai/models', ctrl.listAIModels);
router.get('/ai/models/:id', ctrl.getAIModel);
router.post('/ai/models', ctrl.createAIModel);
router.patch('/ai/models/:id', ctrl.updateAIModel);
router.delete('/ai/models/:id', ctrl.deleteAIModel);

// Storefront
router.get('/storefront/hero', storefront.listHero);
router.post('/storefront/hero', storefront.createHero);
router.patch('/storefront/hero/:id', storefront.updateHero);
router.delete('/storefront/hero/:id', storefront.deleteHero);

router.get('/storefront/sections', storefront.listSections);
router.get('/storefront/sections/:id', storefront.getSection);
router.post('/storefront/sections', storefront.createSection);
router.patch('/storefront/sections/:id', storefront.updateSection);
router.delete('/storefront/sections/:id', storefront.deleteSection);
router.put('/storefront/sections/:id/products', storefront.setSectionProducts);

router.get('/storefront/brands', storefront.listBrands);
router.patch('/storefront/brands/:brandId/review', storefront.reviewBrand);
router.post('/storefront/brands/:brandId/revoke', storefront.revokeBrand);

router.get('/storefront/products', storefront.searchProducts);

router.get('/storefront/editorial', storefront.getEditorial);
router.put('/storefront/editorial', storefront.upsertEditorial);
router.delete('/storefront/editorial', storefront.deleteEditorial);

module.exports = router;