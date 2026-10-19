// adminRoutes.js
const router = require('express').Router();
const { authenticate, authorize } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');
const storefront = require('../controllers/adminStorefrontController');

router.use(authenticate, authorize('SUPER_ADMIN'));

// DASHBOARD
router.get('/dashboard', ctrl.dashboard);

// USERS
router.get('/users', ctrl.listUsers);
router.get('/users/:userId', ctrl.getUser);
router.patch('/users/:userId/activate', ctrl.activateUser);
router.patch('/users/:userId/deactivate', ctrl.deactivateUser);
router.patch('/users/:userId/role', ctrl.changeUserRole);
router.delete('/users/:userId', ctrl.deleteUser);

// BRANDS
router.get('/brands', ctrl.listBrands);
router.delete('/brands/:brandId', ctrl.deleteBrand);

// INFLUENCERS
router.get('/influencers', ctrl.listInfluencers);
router.patch('/influencers/:influencerId/status', ctrl.updateInfluencerStatus);
router.delete('/influencers/:influencerId', ctrl.deleteInfluencer);

// AGENCIES
router.get('/agencies', ctrl.listAgencies);

// PRODUCTS
router.get('/products', ctrl.listProducts);
router.delete('/products/:productId', ctrl.deleteProduct);

// CAMPAIGNS
router.get('/campaigns', ctrl.listCampaigns);

// PAYMENTS
router.get('/payments', ctrl.listPayments);

// FINANCE RULES
router.get('/finance', ctrl.getFinanceRules);
router.patch('/finance', ctrl.updateFinanceRules);

// PLATFORM SETTINGS
router.get('/settings', ctrl.getAllSettings);
router.patch('/settings', ctrl.updateSettings);

// AUDIT
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

// STOREFRONT — HERO
router.get('/storefront/hero', storefront.listHero);
router.post('/storefront/hero', storefront.createHero);
router.patch('/storefront/hero/:id', storefront.updateHero);
router.delete('/storefront/hero/:id', storefront.deleteHero);

// STOREFRONT — SECTIONS
router.get('/storefront/sections', storefront.listSections);
router.get('/storefront/sections/:id', storefront.getSection);
router.post('/storefront/sections', storefront.createSection);
router.patch('/storefront/sections/:id', storefront.updateSection);
router.delete('/storefront/sections/:id', storefront.deleteSection);
router.put('/storefront/sections/:id/products', storefront.setSectionProducts);

// STOREFRONT — BRAND APPLICATIONS
router.get('/storefront/brands', storefront.listBrands);
router.patch('/storefront/brands/:brandId/review', storefront.reviewBrand);
router.post('/storefront/brands/:brandId/revoke', storefront.revokeBrand);

// STOREFRONT — PRODUCT PICKER
router.get('/storefront/products', storefront.searchProducts);

// STOREFRONT — EDITORIAL ✅ NEW
router.get('/storefront/editorial', storefront.getEditorial);
router.put('/storefront/editorial', storefront.upsertEditorial);
router.delete('/storefront/editorial', storefront.deleteEditorial);

module.exports = router;