// controllers/matchingController.js
const svc = require('../services/matching');

async function forProduct(req, res, next) {
  try {
    const { productId } = req.params;
    const result = await svc.recommendForProduct(req.user, productId, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

async function forMe(req, res, next) {
  try {
    const result = await svc.recommendProductsForMe(req.user, {
      limit: req.query.limit ? Number(req.query.limit) : undefined,
      minScore: req.query.minScore ? Number(req.query.minScore) : undefined,
    });
    res.json(result);
  } catch (e) { next(e); }
}

module.exports = { forProduct, forMe };