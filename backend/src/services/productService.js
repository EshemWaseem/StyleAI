






const prisma = require('../config/prisma');
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  extractPublicId,
} = require('../config/cloudinary');
const { generateSku } = require('../utils/sku');

// ======================================================
// TENANT HELPERS
// ======================================================

function tenantWhere(user) {
  if (user.roles.includes('SUPER_ADMIN')) return {};
  if (!user.organizationId) return { brand: { organizationId: '__none__' } };
  return { brand: { organizationId: user.organizationId } };
}

function assertTenantAccess(user, organizationId) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.organizationId || user.organizationId !== organizationId) {
    const err = new Error('Forbidden: product belongs to another organization');
    err.status = 403;
    throw err;
  }
}

function assertHasOrg(user) {
  if (user.roles.includes('SUPER_ADMIN')) return;
  if (!user.organizationId) {
    const err = new Error('You must belong to an organization to do this');
    err.status = 403;
    throw err;
  }
}

// ======================================================
// SHAPE
// ======================================================

function shapeProduct(p) {
  const images = (p.images || [])
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((img) => ({
      id: img.id,
      url: img.url,
      position: img.position,
    }));

  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    description: p.description,
    category: p.category,
    price: p.price != null ? Number(p.price) : null,
    currency: p.currency,
    gender: p.gender,
    season: p.season,
    occasion: p.occasion,
    inventory: p.inventory,
    images,
    primaryImage: images[0]?.url ?? null,
    brand: p.brand
      ? { id: p.brand.id, name: p.brand.name, slug: p.brand.slug }
      : undefined,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

// ======================================================
// CLOUDINARY HELPERS
// ======================================================

async function uploadImages(imageFiles, folder) {
  const uploaded = [];
  for (const file of imageFiles) {
    const result = await uploadBufferToCloudinary(file.buffer, { folder });
    uploaded.push({
      url: result.secure_url,
      publicId: result.public_id,
    });
  }
  return uploaded;
}

async function cleanupCloudinaryImages(uploaded) {
  for (const img of uploaded) {
    if (img.publicId) await deleteFromCloudinary(img.publicId);
  }
}

// ======================================================
// LIST (auth)
// ======================================================

async function listProducts(user, { search } = {}) {
  const where = { ...tenantWhere(user) };
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
    ];
  }
  const products = await prisma.product.findMany({
    where,
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return products.map(shapeProduct);
}

// ======================================================
// GET ONE
// ======================================================

async function getProduct(user, productId) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      brand: true,
      images: { orderBy: { position: 'asc' } },
    },
  });
  if (!product) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, product.brand.organizationId);
  return shapeProduct(product);
}

// ======================================================
// CREATE
// ======================================================

async function createProduct(user, data = {}, imageFiles = []) {
  assertHasOrg(user);

  const {
    name, category, description, price, currency,
    gender, season, occasion, inventory, sku,
  } = data;

  if (!name || !name.trim()) {
    const err = new Error('Product name is required');
    err.status = 400;
    throw err;
  }
  if (!category || !category.trim()) {
    const err = new Error('Product type is required');
    err.status = 400;
    throw err;
  }
  const priceNum = Number(price);
  if (isNaN(priceNum) || priceNum <= 0) {
    const err = new Error('Price must be a positive number');
    err.status = 400;
    throw err;
  }
  if (!Array.isArray(imageFiles) || imageFiles.length === 0) {
    const err = new Error('At least one product image is required');
    err.status = 400;
    throw err;
  }

  const brand = await prisma.brand.findFirst({
    where: { organizationId: user.organizationId },
  });
  if (!brand) {
    const err = new Error('Create your brand before adding products');
    err.status = 400;
    err.code = 'NO_BRAND';
    throw err;
  }

  // ======================================================
  // SKU — auto-generate if missing, or use provided
  // Format: {CAT}-{COLOR}-{GENDER}-{SEQ}   e.g. CLT-BLK-M-001
  // ======================================================
  let finalSku = sku?.trim();

  if (!finalSku) {
    finalSku = await generateSku(prisma, brand.id, {
      category: category?.trim(),
      color: data.color?.trim(),          // optional — falls back to XXX
      target_gender: gender?.trim(),      // "Men" | "Women" | "Unisex" | ...
    });
  }

  // Uniqueness check (auto-gen always unique, but manual could collide)
  const existing = await prisma.product.findFirst({
    where: { brandId: brand.id, sku: finalSku },
  });
  if (existing) {
    const err = new Error('A product with this SKU already exists');
    err.status = 409;
    err.code = 'SKU_EXISTS';
    throw err;
  }

  let uploaded = [];
  try {
    uploaded = await uploadImages(imageFiles, `styleai/products/${brand.id}`);
  } catch (uploadErr) {
    await cleanupCloudinaryImages(uploaded);
    throw uploadErr;
  }

  try {
    const product = await prisma.product.create({
      data: {
        brandId: brand.id,
        name: name.trim(),
        sku: finalSku,
        description: description?.trim() || null,
        category: category.trim(),
        price: priceNum,
        currency: currency || 'USD',
        gender: gender?.trim() || null,
        season: season?.trim() || null,
        occasion: occasion?.trim() || null,
        inventory:
          inventory != null && inventory !== '' ? Number(inventory) : null,
        images: {
          create: uploaded.map((img, i) => ({
            url: img.url,
            position: i,
          })),
        },
      },
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { position: 'asc' } },
      },
    });
    return shapeProduct(product);
  } catch (dbErr) {
    await cleanupCloudinaryImages(uploaded);
    if (dbErr.code === 'P2002') {
      const err = new Error('A product with this SKU already exists');
      err.status = 409;
      throw err;
    }
    throw dbErr;
  }
}

// ======================================================
// UPDATE — additive image management
// ======================================================

async function updateProduct(user, productId, data = {}, imageFiles = []) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: true, images: { orderBy: { position: 'asc' } } },
  });
  if (!existing) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.brand.organizationId);

  let keepImageIds = null;
  if (data.keepImageIds !== undefined && data.keepImageIds !== null) {
    if (Array.isArray(data.keepImageIds)) {
      keepImageIds = data.keepImageIds;
    } else if (typeof data.keepImageIds === 'string') {
      const trimmed = data.keepImageIds.trim();
      if (trimmed === '') {
        keepImageIds = [];
      } else {
        try {
          const parsed = JSON.parse(trimmed);
          if (Array.isArray(parsed)) keepImageIds = parsed;
        } catch {
          // ignore
        }
      }
    }
  }

  const updateData = {};
  const stringFields = [
    'name', 'description', 'category', 'currency',
    'gender', 'season', 'occasion',
  ];
  for (const key of stringFields) {
    if (data[key] !== undefined) {
      updateData[key] = data[key] === '' ? null : data[key];
    }
  }

  // SKU — allow manual change, but blank falls back to existing (no regen on update)
  if (data.sku !== undefined) {
    const newSku = data.sku?.trim();
    if (!newSku) {
      // blank SKU on update → keep existing
      updateData.sku = existing.sku;
    } else if (newSku !== existing.sku) {
      const conflict = await prisma.product.findFirst({
        where: {
          brandId: existing.brandId,
          sku: newSku,
          NOT: { id: productId },
        },
      });
      if (conflict) {
        const err = new Error('A product with this SKU already exists');
        err.status = 409;
        err.code = 'SKU_EXISTS';
        throw err;
      }
      updateData.sku = newSku;
    }
  }

  if (data.price !== undefined) {
    const p = Number(data.price);
    if (isNaN(p) || p <= 0) {
      const err = new Error('Price must be a positive number');
      err.status = 400;
      throw err;
    }
    updateData.price = p;
  }

  if (data.inventory !== undefined) {
    updateData.inventory =
      data.inventory === '' || data.inventory === null
        ? null
        : Number(data.inventory);
  }

  const imagesBeingTouched = keepImageIds !== null;
  const newFiles = Array.isArray(imageFiles) ? imageFiles : [];

  const imagesToDelete = imagesBeingTouched
    ? existing.images.filter((img) => !keepImageIds.includes(img.id))
    : [];

  const imagesToKeep = imagesBeingTouched
    ? existing.images.filter((img) => keepImageIds.includes(img.id))
    : existing.images;

  if (imagesBeingTouched && imagesToKeep.length + newFiles.length === 0) {
    const err = new Error('At least one product image is required');
    err.status = 400;
    throw err;
  }

  let uploadedNew = [];
  if (newFiles.length > 0) {
    try {
      uploadedNew = await uploadImages(
        newFiles,
        `styleai/products/${existing.brandId}`
      );
    } catch (uploadErr) {
      await cleanupCloudinaryImages(uploadedNew);
      throw uploadErr;
    }
  }

  try {
    const product = await prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: { id: productId },
        data: updateData,
      });

      if (imagesToDelete.length > 0) {
        await tx.productImage.deleteMany({
          where: {
            productId,
            id: { in: imagesToDelete.map((i) => i.id) },
          },
        });
      }

      if (uploadedNew.length > 0) {
        let pos = 0;
        for (const img of imagesToKeep) {
          await tx.productImage.update({
            where: { id: img.id },
            data: { position: pos++ },
          });
        }
        for (const up of uploadedNew) {
          await tx.productImage.create({
            data: {
              productId,
              url: up.url,
              position: pos++,
            },
          });
        }
      } else if (imagesBeingTouched) {
        let pos = 0;
        for (const img of imagesToKeep) {
          await tx.productImage.update({
            where: { id: img.id },
            data: { position: pos++ },
          });
        }
      }

      return tx.product.findUnique({
        where: { id: productId },
        include: {
          brand: { select: { id: true, name: true, slug: true } },
          images: { orderBy: { position: 'asc' } },
        },
      });
    });

    for (const img of imagesToDelete) {
      const publicId = extractPublicId(img.url);
      if (publicId) await deleteFromCloudinary(publicId);
    }

    return shapeProduct(product);
  } catch (err) {
    await cleanupCloudinaryImages(uploadedNew);

    if (err.code === 'P2002') {
      const e = new Error('A product with this SKU already exists');
      e.status = 409;
      e.code = 'SKU_EXISTS';
      throw e;
    }
    throw err;
  }
}

// ======================================================
// DELETE
// ======================================================

async function deleteProduct(user, productId) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: true, images: true },
  });
  if (!existing) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.brand.organizationId);

  await prisma.product.delete({ where: { id: productId } });

  for (const img of existing.images) {
    const publicId = extractPublicId(img.url);
    if (publicId) await deleteFromCloudinary(publicId);
  }

  return { id: productId };
}

// ======================================================
// PUBLIC
// ======================================================

async function listPublicProducts({ brandSlug, category, search, limit = 60 } = {}) {
  const where = {};

  if (brandSlug) where.brand = { slug: brandSlug };
  if (category && category !== 'All') where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  const products = await prisma.product.findMany({
    where,
    take: Math.min(limit, 200),
    include: {
      brand: { select: { id: true, name: true, slug: true, logoUrl: true } },
      images: { orderBy: { position: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return products.map((p) => {
    const images = (p.images || []).map((img) => ({
      id: img.id,
      url: img.url,
      position: img.position,
    }));

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      category: p.category,
      price: p.price != null ? Number(p.price) : null,
      currency: p.currency,
      gender: p.gender,
      season: p.season,
      occasion: p.occasion,
      images,
      primaryImage: images[0]?.url ?? null,
      brand: p.brand,
    };
  });
}

async function listPublicBrands() {
  const brands = await prisma.brand.findMany({
    where: { products: { some: {} } },
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  });

  return brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    logoUrl: b.logoUrl,
    productCount: b._count.products,
  }));
}

// ======================================================
// UPDATE INVENTORY ONLY
// ======================================================

async function updateProductInventory(user, productId, data = {}) {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: true },
  });
  if (!existing) {
    const err = new Error('Product not found');
    err.status = 404;
    throw err;
  }
  assertTenantAccess(user, existing.brand.organizationId);

  if (data.inventory === undefined) {
    const err = new Error('inventory field is required');
    err.status = 400;
    throw err;
  }

  let inventoryValue;
  if (data.inventory === null || data.inventory === '') {
    inventoryValue = null;
  } else {
    const n = Number(data.inventory);
    if (isNaN(n) || n < 0 || !Number.isInteger(n)) {
      const err = new Error('Inventory must be a non-negative integer');
      err.status = 400;
      throw err;
    }
    inventoryValue = n;
  }

  const product = await prisma.product.update({
    where: { id: productId },
    data: { inventory: inventoryValue },
    include: {
      brand: { select: { id: true, name: true, slug: true } },
      images: { orderBy: { position: 'asc' } },
    },
  });

  return shapeProduct(product);
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  updateProductInventory,
  deleteProduct,
  listPublicProducts,
  listPublicBrands,
};

