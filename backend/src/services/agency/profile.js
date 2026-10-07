// services/agency/profile.js
// ======================================================
// Agency profile — service categories + rate cards
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

const VALID_SERVICE_TYPES = [
  'BRAND_SYSTEM_MANAGEMENT',
  'BRAND_WEBSITE',
  'BRAND_CAMPAIGN_OPS',
  'INFLUENCER_PHOTOSHOOT',
  'INFLUENCER_VIDEOGRAPHY',
];

const BRAND_SERVICES = VALID_SERVICE_TYPES.filter((s) => s.startsWith('BRAND_'));
const INFLUENCER_SERVICES = VALID_SERVICE_TYPES.filter((s) => s.startsWith('INFLUENCER_'));

function assertAgency(user) {
  if (!user?.roles?.includes('AGENCY') && !user?.roles?.includes('SUPER_ADMIN')) {
    throw httpError('Only agencies can manage agency profile', 403, 'NOT_AGENCY');
  }
  if (!user.organizationId) {
    throw httpError('No organization linked to your account', 403, 'NO_ORG');
  }
}

async function getOrCreateProfile(organizationId) {
  let profile = await prisma.agencyProfile.findUnique({
    where: { organizationId },
  });
  if (!profile) {
    profile = await prisma.agencyProfile.create({
      data: { organizationId, serviceTypes: [] },
    });
  }
  return profile;
}

async function getMyProfile(user) {
  assertAgency(user);
  const profile = await getOrCreateProfile(user.organizationId);
  return shapeProfile(profile);
}

async function updateProfile(user, payload = {}) {
  assertAgency(user);
  const profile = await getOrCreateProfile(user.organizationId);

  const data = {};

  // String fields
  ['displayName', 'tagline', 'description', 'website', 'logoUrl'].forEach((k) => {
    if (payload[k] !== undefined) {
      data[k] = payload[k] ? String(payload[k]).trim() : null;
    }
  });

  if (payload.currency !== undefined) {
    data.currency = String(payload.currency || 'PKR').toUpperCase();
  }

  // Booleans
  ['verified', 'isAcceptingNew'].forEach((k) => {
    if (payload[k] !== undefined) data[k] = Boolean(payload[k]);
  });

  // Numerics
  ['monthlyRetainer', 'hourlyRate', 'photoshootRate', 'videographyRate'].forEach((k) => {
    if (payload[k] !== undefined) {
      data[k] =
        payload[k] === null || payload[k] === ''
          ? null
          : Number(payload[k]);
    }
  });

  // Arrays
  if (Array.isArray(payload.portfolioUrls)) {
    data.portfolioUrls = payload.portfolioUrls.map((s) => String(s).trim()).filter(Boolean);
  }

  if (Array.isArray(payload.serviceTypes)) {
    data.serviceTypes = payload.serviceTypes.filter((s) =>
      VALID_SERVICE_TYPES.includes(s)
    );
  }

  const updated = await prisma.agencyProfile.update({
    where: { id: profile.id },
    data,
  });

  return shapeProfile(updated);
}

async function getProfileByOrgId(organizationId) {
  if (!organizationId) return null;
  const p = await prisma.agencyProfile.findUnique({ where: { organizationId } });
  return p ? shapeProfile(p) : null;
}

/**
 * Public listing — brands/influencers browse agencies by service.
 */
async function listAgenciesForService({ serviceType, limit = 50 } = {}) {
  const where = { isAcceptingNew: true };
  if (serviceType && VALID_SERVICE_TYPES.includes(serviceType)) {
    where.serviceTypes = { has: serviceType };
  }

  const profiles = await prisma.agencyProfile.findMany({
    where,
    take: Math.min(Number(limit) || 50, 100),
    orderBy: [{ verified: 'desc' }, { updatedAt: 'desc' }],
  });

  // Enrich with organization info
  const orgIds = profiles.map((p) => p.organizationId);
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return profiles.map((p) => ({
    ...shapeProfile(p),
    organization: orgMap.get(p.organizationId) || null,
  }));
}

function shapeProfile(p) {
  return {
    id: p.id,
    organizationId: p.organizationId,
    displayName: p.displayName,
    tagline: p.tagline,
    description: p.description,
    website: p.website,
    logoUrl: p.logoUrl,
    serviceTypes: p.serviceTypes || [],
    monthlyRetainer: p.monthlyRetainer != null ? Number(p.monthlyRetainer) : null,
    hourlyRate: p.hourlyRate != null ? Number(p.hourlyRate) : null,
    photoshootRate: p.photoshootRate != null ? Number(p.photoshootRate) : null,
    videographyRate: p.videographyRate != null ? Number(p.videographyRate) : null,
    currency: p.currency,
    portfolioUrls: p.portfolioUrls || [],
    verified: p.verified,
    isAcceptingNew: p.isAcceptingNew,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  };
}

module.exports = {
  VALID_SERVICE_TYPES,
  BRAND_SERVICES,
  INFLUENCER_SERVICES,
  getMyProfile,
  updateProfile,
  getProfileByOrgId,
  getOrCreateProfile,
  listAgenciesForService,
  shapeProfile,
};