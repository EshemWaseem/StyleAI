// controllers/recommendationsController.js
// ======================================================
// Recommendations controller
// ======================================================

const svc = require('../services/recommendations');

/**
 * GET /api/recommendations
 * Returns personalized insights for the current user's brand
 */
async function list(req, res, next) {
  try {
    const result = await svc.forBrand(req.user);
    res.json(result);
  } catch (e) {
    next(e);
  }
}

module.exports = { list };