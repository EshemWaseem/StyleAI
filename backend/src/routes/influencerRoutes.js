const router = require('express').Router();
const { authenticate, requirePermission } = require('../middleware/auth');
const ctrl = require('../controllers/influencerController');

router.use(authenticate);

// ----- Avatar upload -----
router.post(
  '/upload-avatar',
  ctrl.avatarUpload.single('avatar'),
  ctrl.uploadAvatar
);

// ----- List -----
router.get('/', requirePermission('influencer.read'), ctrl.list);

// ----- My profile (MUST come before /:idOrSlug) -----
router.get('/me', requirePermission('influencer.read'), ctrl.getMe);

// ----- Detail -----
router.get('/:idOrSlug', requirePermission('influencer.read'), ctrl.getOne);

// ----- Create -----
router.post('/', requirePermission('influencer.create'), ctrl.create);

// ----- Update -----
router.patch('/:influencerId', requirePermission('influencer.update'), ctrl.update);

// ----- Archive -----
router.delete('/:influencerId', requirePermission('influencer.delete'), ctrl.remove);

// ----- Save / unsave -----
router.post('/:influencerId/save', requirePermission('influencer.save'), ctrl.save);
router.delete('/:influencerId/save', requirePermission('influencer.save'), ctrl.unsave);

module.exports = router;






// //influencerRoutes.js
// // 2:04 23-09

// const router = require('express').Router();
// const { authenticate, requirePermission } = require('../middleware/auth');
// const ctrl = require('../controllers/influencerController');

// router.use(authenticate);

// // ----- List -----
// router.get('/', requirePermission('influencer.read'), ctrl.list);

// // ----- My profile (MUST come before /:idOrSlug) -----
// router.get('/me', requirePermission('influencer.read'), ctrl.getMe);

// // ----- Detail by id or slug -----
// router.get('/:idOrSlug', requirePermission('influencer.read'), ctrl.getOne);

// // ----- Create -----
// router.post('/', requirePermission('influencer.create'), ctrl.create);

// // ----- Update -----
// router.patch(
//   '/:influencerId',
//   requirePermission('influencer.update'),
//   ctrl.update
// );

// // ----- Archive -----
// router.delete(
//   '/:influencerId',
//   requirePermission('influencer.delete'),
//   ctrl.remove
// );

// // ----- Save / unsave -----
// router.post(
//   '/:influencerId/save',
//   requirePermission('influencer.save'),
//   ctrl.save
// );
// router.delete(
//   '/:influencerId/save',
//   requirePermission('influencer.save'),
//   ctrl.unsave
// );

// module.exports = router;