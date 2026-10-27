// controllers/brandController.js
const brandService = require('../services/brandService');


// Effective user — when an agency sends X-Acting-Brand,
// downstream services must operate against the CLIENT
// brand's organization, not the agency's own org.
// If no acting brand → returns req.user unchanged (zero impact).

function effectiveUser(req) {
  if (req.actingBrandId && req.actingOrganizationId) {
    return {
      ...req.user,
      organizationId: req.actingOrganizationId,
      actingBrandId: req.actingBrandId,
      actingOrganizationId: req.actingOrganizationId,
      actingBrand: req.actingBrand,
    };
  }
  return req.user;
}

// GET /api/brands
async function list(req, res, next) {
  try {
    const brands = await brandService.listBrands(effectiveUser(req), {
      search: req.query.search,
    });
    res.json({ count: brands.length, brands });
  } catch (err) {
    next(err);
  }
}

// GET /api/brands/:brandId
async function getOne(req, res, next) {
  try {
    const brand = await brandService.getBrand(
      effectiveUser(req),
      req.params.brandId
    );
    res.json({ brand });
  } catch (err) {
    next(err);
  }
}

// POST /api/brands
// ⚠️ Agencies should NOT create new brands while acting
// on behalf of a client. Block if acting brand is set.
async function create(req, res, next) {
  try {
    if (req.actingBrandId) {
      return res.status(403).json({
        message:
          'Agencies cannot create brands while acting on behalf of a client.',
        code: 'ACTING_BRAND_NO_CREATE',
      });
    }
    const brand = await brandService.createBrand(req.user, req.body);
    res.status(201).json({ message: 'Brand created', brand });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/brands/:brandId
async function update(req, res, next) {
  try {
    const brand = await brandService.updateBrand(
      effectiveUser(req),
      req.params.brandId,
      req.body
    );
    res.json({ message: 'Brand updated', brand });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/brands/:brandId
// ⚠️ Agencies should NOT delete a client's brand.
async function remove(req, res, next) {
  try {
    if (req.actingBrandId) {
      return res.status(403).json({
        message:
          'Agencies cannot delete brands while acting on behalf of a client.',
        code: 'ACTING_BRAND_NO_DELETE',
      });
    }
    const result = await brandService.deleteBrand(
      req.user,
      req.params.brandId
    );
    res.json({ message: 'Brand deleted', ...result });
  } catch (err) {
    next(err);
  }
}

async function listPublicBrands(req, res, next) {
  try {
    const brands = await brandService.listPublicBrandsAll();
    res.json({ count: brands.length, brands });
  } catch (err) {
    next(err);
  }
}

async function getPublicBrandRoles(req, res, next) {
  try {
    const roles = await brandService.getPublicBrandRoles(req.params.brandId);
    res.json({ count: roles.length, roles });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  remove,
  listPublicBrands,
  getPublicBrandRoles,
};