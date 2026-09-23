const productService = require('../services/productService');

// ======================================================
// PUBLIC
// ======================================================

async function listPublic(req, res, next) {
  try {
    const products = await productService.listPublicProducts({
      brandSlug: req.query.brand,
      category: req.query.category,
      search: req.query.search,
      limit: req.query.limit ? Number(req.query.limit) : 60,
    });
    res.json({ count: products.length, products });
  } catch (err) {
    next(err);
  }
}

async function listPublicBrands(req, res, next) {
  try {
    const brands = await productService.listPublicBrands();
    res.json({ count: brands.length, brands });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// AUTH
// ======================================================

async function list(req, res, next) {
  try {
    const products = await productService.listProducts(req.user, {
      search: req.query.search,
    });
    res.json({ count: products.length, products });
  } catch (err) {
    next(err);
  }
}

async function getOne(req, res, next) {
  try {
    const product = await productService.getProduct(req.user, req.params.productId);
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function create(req, res, next) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const body = req.body || {};
    const product = await productService.createProduct(req.user, body, files);
    res.status(201).json({ message: 'Product created', product });
  } catch (err) {
    if (err.code === 'NO_BRAND') {
      return res.status(400).json({ message: err.message, code: 'NO_BRAND' });
    }
    if (err.code === 'SKU_EXISTS') {
      return res.status(409).json({ message: err.message, code: 'SKU_EXISTS' });
    }
    next(err);
  }
}

async function update(req, res, next) {
  try {
    const files = Array.isArray(req.files) ? req.files : [];
    const body = req.body || {};
    const product = await productService.updateProduct(
      req.user,
      req.params.productId,
      body,
      files
    );
    res.json({ message: 'Product updated', product });
  } catch (err) {
    if (err.status === 409 || err.code === 'SKU_EXISTS') {
      return res.status(409).json({ message: err.message, code: 'SKU_EXISTS' });
    }
    next(err);
  }
}

async function remove(req, res, next) {
  try {
    const result = await productService.deleteProduct(req.user, req.params.productId);
    res.json({ message: 'Product deleted', ...result });
  } catch (err) {
    next(err);
  }
}

// ======================================================
// PATCH /api/products/:productId/inventory
// Restricted endpoint — only inventory column updated
// ======================================================
async function updateInventory(req, res, next) {
  try {
    const product = await productService.updateProductInventory(
      req.user,
      req.params.productId,
      req.body
    );
    res.json({ message: 'Inventory updated', product });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  list,
  getOne,
  create,
  update,
  updateInventory,
  remove,
  listPublic,
  listPublicBrands,
};