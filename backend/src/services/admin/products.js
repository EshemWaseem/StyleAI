const prisma = require('../../config/prisma');
const { assertSuperAdmin, httpError, writeAudit, parsePagination } = require('./helpers');

async function listProducts(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);
  const { search, brandId } = filters;

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }
  if (brandId) where.brandId = brandId;

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        brand: { select: { id: true, name: true, slug: true } },
        images: { orderBy: { position: 'asc' }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.product.count({ where }),
  ]);

  return {
    total,
    count: products.length,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      category: p.category,
      price: p.price != null ? Number(p.price) : null,
      currency: p.currency,
      inventory: p.inventory,
      primaryImage: p.images[0]?.url ?? null,
      brand: p.brand,
      createdAt: p.createdAt,
    })),
  };
}

async function deleteProduct(adminUser, productId, req) {
  assertSuperAdmin(adminUser);
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { brand: { select: { name: true } } },
  });
  if (!product) throw httpError('Product not found', 404);

  await prisma.product.delete({ where: { id: productId } });

  await writeAudit({
    actorId: adminUser.id,
    action: 'product.delete',
    targetType: 'product',
    targetId: productId,
    meta: { name: product.name, brand: product.brand?.name },
    ipAddress: req?.ip,
  });

  return { id: productId };
}

module.exports = { listProducts, deleteProduct };