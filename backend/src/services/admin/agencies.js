const prisma = require('../../config/prisma');
const { assertSuperAdmin, parsePagination } = require('./helpers');

async function listAgencies(adminUser, filters = {}) {
  assertSuperAdmin(adminUser);
  const { limit, offset } = parsePagination(filters);

  // Agencies = users with AGENCY role
  const agencyRole = await prisma.role.findUnique({ where: { name: 'AGENCY' } });
  if (!agencyRole) return { total: 0, count: 0, agencies: [] };

  const [rows, total] = await Promise.all([
    prisma.userRole.findMany({
      where: { roleId: agencyRole.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            isActive: true,
            organizationId: true,
            organization: { select: { id: true, name: true, slug: true } },
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.userRole.count({ where: { roleId: agencyRole.id } }),
  ]);

  return {
    total,
    count: rows.length,
    agencies: rows.map((r) => ({
      userId: r.user.id,
      name: r.user.name,
      email: r.user.email,
      isActive: r.user.isActive,
      organization: r.user.organization,
      createdAt: r.user.createdAt,
    })),
  };
}

module.exports = { listAgencies };