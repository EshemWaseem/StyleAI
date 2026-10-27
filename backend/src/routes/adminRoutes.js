// backend/src/routes/adminRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const storefront = require('../controllers/adminStorefrontController');
const orders = require('../controllers/adminOrderController');

router.use(authenticate, authorize('SUPER_ADMIN'));

router.get('/dashboard', ctrl.dashboard);

router.get('/users', ctrl.listUsers);
router.get('/users/:userId', ctrl.getUser);
router.patch('/users/:userId/activate', ctrl.activateUser);
router.patch('/users/:userId/deactivate', ctrl.deactivateUser);
router.patch('/users/:userId/role', ctrl.changeUserRole);
router.delete('/users/:userId', ctrl.deleteUser);

router.get('/brands', ctrl.listBrands);
router.delete('/brands/:brandId', ctrl.deleteBrand);

router.get('/influencers', ctrl.listInfluencers);
router.patch('/influencers/:influencerId/status', ctrl.updateInfluencerStatus);
router.delete('/influencers/:influencerId', ctrl.deleteInfluencer);

router.get('/agencies', ctrl.listAgencies);

router.get('/products', ctrl.listProducts);
router.delete('/products/:productId', ctrl.deleteProduct);

router.get('/campaigns', ctrl.listCampaigns);

router.post('/campaign-requests', ctrl.createCampaignRequest);
router.get('/campaign-requests', ctrl.listCampaignRequests);

router.get('/payments', ctrl.listPayments);

// ORDERS
router.get('/orders', orders.listOrders);
router.get('/orders/:orderId', orders.getOrder);
router.post('/orders/:orderId/confirm-delivery', orders.confirmDelivery);
router.post('/orders/:orderId/cancel', orders.cancelOrder);

router.get('/finance', ctrl.getFinanceRules);
router.patch('/finance', ctrl.updateFinanceRules);

router.get('/settings', ctrl.getAllSettings);
router.patch('/settings', ctrl.updateSettings);

router.get('/audit', ctrl.listAuditLogs);

router.get('/ai/stats', ctrl.getAIStats);
router.get('/ai/timeline', ctrl.getAITimeline);
router.get('/ai/usage', ctrl.listAIUsage);
router.get('/ai/models', ctrl.listAIModels);
router.get('/ai/models/:id', ctrl.getAIModel);
router.post('/ai/models', ctrl.createAIModel);
router.patch('/ai/models/:id', ctrl.updateAIModel);
router.delete('/ai/models/:id', ctrl.deleteAIModel);

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