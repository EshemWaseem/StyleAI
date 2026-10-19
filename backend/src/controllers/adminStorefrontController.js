// controllers/adminStorefrontController.js
const svc = require('../services/admin/storefront');

// HERO
async function listHero(req, res, next) { try { res.json({ hero: await svc.listHero(req.user) }); } catch (e) { next(e); } }
async function createHero(req, res, next) { try { res.status(201).json({ message: 'Slide added', hero: await svc.createHero(req.user, req.body, req) }); } catch (e) { next(e); } }
async function updateHero(req, res, next) { try { res.json({ message: 'Slide updated', hero: await svc.updateHero(req.user, req.params.id, req.body, req) }); } catch (e) { next(e); } }
async function deleteHero(req, res, next) { try { res.json({ message: 'Slide deleted', ...(await svc.deleteHero(req.user, req.params.id, req)) }); } catch (e) { next(e); } }

// SECTIONS
async function listSections(req, res, next) { try { res.json({ sections: await svc.listSections(req.user) }); } catch (e) { next(e); } }
async function getSection(req, res, next) { try { res.json({ section: await svc.getSection(req.user, req.params.id) }); } catch (e) { next(e); } }
async function createSection(req, res, next) { try { res.status(201).json({ message: 'Section created', section: await svc.createSection(req.user, req.body, req) }); } catch (e) { next(e); } }
async function updateSection(req, res, next) { try { res.json({ message: 'Section updated', section: await svc.updateSection(req.user, req.params.id, req.body, req) }); } catch (e) { next(e); } }
async function deleteSection(req, res, next) { try { res.json({ message: 'Section deleted', ...(await svc.deleteSection(req.user, req.params.id, req)) }); } catch (e) { next(e); } }
async function setSectionProducts(req, res, next) {
  try {
    const ids = req.body?.productIds ?? [];
    const result = await svc.setSectionProducts(req.user, req.params.id, ids, req);
    res.json({ message: 'Products updated', ...result });
  } catch (e) { next(e); }
}

// BRAND APPLICATIONS
async function listBrands(req, res, next) { try { res.json({ brands: await svc.listBrandsWithStatus(req.user, req.query) }); } catch (e) { next(e); } }
async function reviewBrand(req, res, next) {
  try {
    const approve = req.body?.approve === true;
    const reason = req.body?.reason;
    const brand = await svc.reviewBrandApplication(req.user, req.params.brandId, approve, reason, req);
    res.json({ message: approve ? 'Brand approved for storefront' : 'Brand application declined', brand });
  } catch (e) { next(e); }
}
async function revokeBrand(req, res, next) {
  try {
    const reason = req.body?.reason;
    const result = await svc.revokeBrandOptIn(req.user, req.params.brandId, reason, req);
    res.json({ message: 'Brand removed from storefront', ...result });
  } catch (e) { next(e); }
}

// PRODUCT PICKER
async function searchProducts(req, res, next) { try { res.json({ products: await svc.searchApprovedProducts(req.user, req.query) }); } catch (e) { next(e); } }

// ✅ NEW — EDITORIAL
async function getEditorial(req, res, next) {
  try { res.json({ editorial: await svc.getEditorial(req.user) }); } catch (e) { next(e); }
}
async function upsertEditorial(req, res, next) {
  try {
    const editorial = await svc.upsertEditorial(req.user, req.body, req);
    res.json({ message: 'Editorial saved', editorial });
  } catch (e) { next(e); }
}
async function deleteEditorial(req, res, next) {
  try {
    const result = await svc.deleteEditorial(req.user, req);
    res.json({ message: 'Editorial deleted', ...result });
  } catch (e) { next(e); }
}

module.exports = {
  listHero, createHero, updateHero, deleteHero,
  listSections, getSection, createSection, updateSection, deleteSection, setSectionProducts,
  listBrands, reviewBrand, revokeBrand,
  searchProducts,
  // ✅ NEW
  getEditorial, upsertEditorial, deleteEditorial,
};