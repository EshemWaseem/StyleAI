// controllers/storefrontController.js
const svc = require('../services/storefrontService');
const prisma = require('../config/prisma');
const { getAll } = require('../services/admin/settingsService'); // 👈 Import

async function getPublicStorefront(req, res, next) {
  try { res.json(await svc.getStorefront()); } catch (err) { next(err); }
}

async function getPublicStats(req, res, next) {
  try {
    const [brandsCount, creatorsCount, withdrawalsAgg] = await Promise.all([
      prisma.userRole.count({ where: { role: { name: 'BRAND_OWNER' } } }),
      prisma.userRole.count({ where: { role: { name: 'INFLUENCER' } } }),
      prisma.walletTransaction.aggregate({
        _sum: { amount: true },
        where: { type: 'WITHDRAWAL', status: 'COMPLETED' }
      })
    ]);
    const paidOut = Math.abs(Number(withdrawalsAgg._sum.amount || 0));
    res.json({ brands: brandsCount, creators: creatorsCount, paidOut });
  } catch (err) { next(err); }
}

// 🆕 FETCH PUBLIC SETTINGS
async function getPublicSettings(req, res, next) {
  try {
    const settings = await getAll();
    res.json({ minOrderAmount: settings.limits.minOrderAmount || 500 });
  } catch (err) {
    res.json({ minOrderAmount: 500 }); // fallback
  }
}

async function getMyStatus(req, res, next) {
  try { res.json({ status: await svc.getMyBrandStorefrontStatus(req.user) }); }
  catch (err) { next(err); }
}

async function apply(req, res, next) {
  try {
    const status = await svc.applyForStorefront(req.user, req.body || {});
    res.status(201).json({ message: 'Application submitted.', status });
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
    const product = await svc.toggleMyProductVisibility(req.user, req.params.productId, visible);
    res.json({ message: visible ? 'Product visible' : 'Product hidden', product });
  } catch (err) { next(err); }
}

module.exports = {
  getPublicStorefront, getPublicStats, getPublicSettings,
  getMyStatus, apply, withdraw, toggleProductVisibility,
};