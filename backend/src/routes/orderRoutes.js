const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/orderController');

// All order routes require authentication
router.use(authenticate);

router.post('/', requirePermission('order.create'), ctrl.createOrder);
router.get('/', requirePermission('order.read'), ctrl.listOrders);
router.get('/:id', requirePermission('order.read'), ctrl.getOrder);

module.exports = router;