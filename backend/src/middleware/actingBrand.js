// middleware/actingBrand.js
// ======================================================
// Agency clients use "X-Acting-Brand: <brandId>" header
// to operate on behalf of a client brand.
// Populates req.actingBrand = { id, organizationId, ... }
// ======================================================

const prisma = require('../config/prisma');
const { httpError } = require('../services/influencer/helpers');

async function resolveActingBrand(req, res, next) {
  try {
    const brandId = req.headers['x-acting-brand'];
    if (!brandId) return next();

    const isAgency = req.user?.roles?.includes('AGENCY');
    const isAdmin = req.user?.roles?.includes('SUPER_ADMIN');

    if (!isAgency && !isAdmin) {
      throw httpError('Only agencies can use X-Acting-Brand', 403, 'NOT_AGENCY');
    }

    const brand = await prisma.brand.findUnique({
      where: { id: String(brandId) },
      include: { organization: true },
    });
    if (!brand) throw httpError('Acting brand not found', 404, 'BRAND_NOT_FOUND');

    // Agency must have an AgencyClient link to this brand's organization
    if (isAgency) {
      const link = await prisma.agencyClient.findFirst({
        where: {
          agencyOrganizationId: req.user.organizationId,
          clientOrganizationId: brand.organizationId,
          status: { not: 'COMPLETED' }, // allow ACTIVE | PAUSED | AT_RISK
        },
      });
      if (!link) {
        throw httpError(
          'Your agency does not have access to this brand',
          403,
          'AGENCY_NO_ACCESS'
        );
      }
    }

    req.actingBrand = brand;
    req.actingBrandId = brand.id;
    req.actingOrganizationId = brand.organizationId;
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { resolveActingBrand };