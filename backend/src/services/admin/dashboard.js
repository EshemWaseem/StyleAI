const prisma = require('../../config/prisma');
const { assertSuperAdmin } = require('./helpers');

async function getPlatformStats(adminUser) {
  assertSuperAdmin(adminUser);

  const [
    totalUsers,
    activeUsers,
    totalOrganizations,
    totalBrands,
    totalProducts,
    totalInfluencers,
    totalAgencies,
    totalShoppers,
    totalCampaigns,
    recentUsers,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.organization.count(),
    prisma.brand.count(),
    prisma.product.count(),
    prisma.influencer.count({ where: { status: 'ACTIVE' } }),
    prisma.userRole.count({ where: { role: { name: 'AGENCY' } } }),
    prisma.userRole.count({ where: { role: { name: 'SHOPPER' } } }),
    // Campaigns model may not exist yet — safe fallback
    prisma.$queryRaw`SELECT COUNT(*)::int AS c FROM "Campaign"`.catch(() => [{ c: 0 }]),
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
        userRoles: { include: { role: { select: { name: true } } } },
      },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      active: activeUsers,
      inactive: totalUsers - activeUsers,
    },
    organizations: totalOrganizations,
    brands: totalBrands,
    products: totalProducts,
    influencers: totalInfluencers,
    agencies: totalAgencies,
    shoppers: totalShoppers,
    campaigns: Array.isArray(totalCampaigns) ? totalCampaigns[0]?.c ?? 0 : 0,
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      isActive: u.isActive,
      createdAt: u.createdAt,
      roles: u.userRoles.map((r) => r.role.name),
    })),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = { getPlatformStats };