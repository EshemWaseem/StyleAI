// controllers/storefrontController.js
const svc = require('../services/storefrontService');

async function getPublicStorefront(req, res, next) {
  try { res.json(await svc.getStorefront()); } catch (err) { next(err); }
}

async function getMyStatus(req, res, next) {
  try { res.json({ status: await svc.getMyBrandStorefrontStatus(req.user) }); }
  catch (err) { next(err); }
}

async function apply(req, res, next) {
  try {
    const status = await svc.applyForStorefront(req.user, req.body || {});
    res.status(201).json({
      message: 'Application submitted. Our team will review it shortly.',
      status,
    });
  } catch (err) { next(err); }
}

async function withdraw(req, res, next) {
  try {
    const status = await svc.withdrawApplication(req.user);
    res.json({ message: 'Application withdrawn.', status });
  } catch (err) { next(err); }
}

async function toggleProductVisibility(req, res, next) {
  try {
    const visible = !!req.body?.visible;
    const product = await svc.toggleMyProductVisibility(
      req.user, req.params.productId, visible
    );
    res.json({
      message: visible ? 'Product visible on storefront' : 'Product hidden',
      product,
    });
  } catch (err) { next(err); }
}

module.exports = {
  getPublicStorefront,
  getMyStatus,
  apply,
  withdraw,
  toggleProductVisibility,
};