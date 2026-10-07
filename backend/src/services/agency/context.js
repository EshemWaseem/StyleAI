// services/agency/context.js
// ======================================================
// Resolve which brand a request is acting on.
// Prefers req.actingBrandId (set by middleware),
// else uses user's own organization's first brand.
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

async function resolveActiveBrand(user, actingBrandId) {
  if (actingBrandId) {
    const brand = await prisma.brand.findUnique({ where: { id: actingBrandId } });
    if (!brand) throw httpError('Acting brand not found', 404, 'BRAND_NOT_FOUND');
    return brand;
  }

  if (!user.organizationId) {
    throw httpError('No organization linked to your account', 403, 'NO_ORG');
  }
  const brand = await prisma.brand.findFirst({
    where: { organizationId: user.organizationId },
    orderBy: { createdAt: 'asc' },
  });
  if (!brand) {
    throw httpError('No brand found in your organization', 404, 'NO_BRAND');
  }
  return brand;
}

async function listAgencyClients(user) {
  if (!user.roles?.includes('AGENCY')) {
    throw httpError('Only agencies can list clients', 403, 'NOT_AGENCY');
  }

  const links = await prisma.agencyClient.findMany({
    where: {
      agencyOrganizationId: user.organizationId,
      status: { not: 'COMPLETED' },
    },
    include: {
      clientOrganization: {
        include: {
          brands: {
            select: { id: true, name: true, slug: true, logoUrl: true },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return links.map((l) => ({
    id: l.id,
    status: l.status,
    clientOrganization: {
      id: l.clientOrganization.id,
      name: l.clientOrganization.name,
      slug: l.clientOrganization.slug,
    },
    brands: l.clientOrganization.brands,
  }));
}

module.exports = { resolveActiveBrand, listAgencyClients };