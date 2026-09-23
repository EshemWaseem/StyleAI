const brandService = require('../services/brandService');

// GET /api/brands
async function list(req, res, next) {
  try {
    const brands = await brandService.listBrands(req.user, {
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
    const brand = await brandService.getBrand(req.user, req.params.brandId);
    res.json({ brand });
  } catch (err) {
    next(err);
  }
}

// POST /api/brands
async function create(req, res, next) {
  try {
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
      req.user,
      req.params.brandId,
      req.body
    );
    res.json({ message: 'Brand updated', brand });
  } catch (err) {
    next(err);
  }
}

// DELETE /api/brands/:brandId
async function remove(req, res, next) {
  try {
    const result = await brandService.deleteBrand(req.user, req.params.brandId);
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

// module.exports = { list, getOne, create, update, remove, listPublicBrands };

// module.exports = { list, getOne, create, update, remove };