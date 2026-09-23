const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/cartController');

// All cart routes require authentication + cart.manage permission
router.use(authenticate, requirePermission('cart.manage'));

router.get('/', ctrl.getCart);
router.post('/items', ctrl.addItem);
router.patch('/items/:productId', ctrl.updateItem);
router.delete('/items/:productId', ctrl.removeItem);
router.delete('/', ctrl.clearCart);

module.exports = router;