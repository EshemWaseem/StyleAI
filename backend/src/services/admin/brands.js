const prisma = require('../../config/prisma');
const { assertSuperAdmin, httpError, writeAudit, parsePagination } = require('./helpers');

async function listBrands(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);
  const { search } = filters;

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [brands, total] = await Promise.all([
    prisma.brand.findMany({
      where,
      include: {
        organization: { select: { id: true, name: true, slug: true } },
        _count: { select: { products: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.brand.count({ where }),
  ]);

  return {
    total,
    count: brands.length,
    brands: brands.map((b) => ({
      id: b.id,
      name: b.name,
      slug: b.slug,
      description: b.description,
      logoUrl: b.logoUrl,
      website: b.website,
      country: b.country,
      currency: b.currency,
      organization: b.organization,
      productCount: b._count.products,
      createdAt: b.createdAt,
    })),
  };
}

async function deleteBrand(adminUser, brandId, req) {
  assertSuperAdmin(adminUser);
  const brand = await prisma.brand.findUnique({ where: { id: brandId } });
  if (!brand) throw httpError('Brand not found', 404);

  await prisma.brand.delete({ where: { id: brandId } });

  await writeAudit({
    actorId: adminUser.id,
    action: 'brand.delete',
    targetType: 'brand',
    targetId: brandId,
    meta: { name: brand.name, slug: brand.slug },
    ipAddress: req?.ip,
  });

  return { id: brandId };
}

module.exports = { listBrands, deleteBrand };