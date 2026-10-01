// controllers/catalogController.js
const {
  PLATFORM_CATALOG,
  getCatalogForClient,
} = require('../config/platformCatalog');

function listPlatforms(req, res) {
  res.json({ platforms: getCatalogForClient() });
}

function listContentTypes(req, res) {
  const key = String(req.params.platform || '').toUpperCase();
  const cfg = PLATFORM_CATALOG[key];
  if (!cfg) {
    return res.status(404).json({ message: `Unknown platform "${req.params.platform}"` });
  }
  res.json({ platform: key, label: cfg.label, contentTypes: cfg.contentTypes });
}

module.exports = { listPlatforms, listContentTypes };