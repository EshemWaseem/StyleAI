// services/chat/parties.js
// ======================================================
// Search parties (influencers + agencies) to start a chat with
// ======================================================

const prisma = require('../../config/prisma');

async function searchParties(user, query = {}) {
  const q = String(query.q || '').trim();
  const limit = Math.min(Number(query.limit) || 20, 50);
  const type = String(query.type || 'ALL').toUpperCase(); // ALL | INFLUENCER | AGENCY

  const results = [];

  // ---------- INFLUENCERS ----------
  if (type === 'ALL' || type === 'INFLUENCER') {
    const where = {
      status: 'ACTIVE',
      ...(q
        ? {
            OR: [
              { displayName: { contains: q, mode: 'insensitive' } },
              { username:    { contains: q, mode: 'insensitive' } },
              { categories:  { has: q } },
            ],
          }
        : {}),
    };

    const infs = await prisma.influencer.findMany({
      where,
      select: {
        id: true,
        displayName: true,
        username: true,
        avatarUrl: true,
        slug: true,
        country: true,
      },
      take: limit,
      orderBy: { followerCount: 'desc' },
    });

    results.push(
      ...infs.map((i) => ({
        type: 'INFLUENCER',
        id: i.id,
        displayName: i.displayName,
        handle: `@${i.username}`,
        avatarUrl: i.avatarUrl,
        subtitle: i.country || 'Creator',
        slug: i.slug,
      }))
    );
  }

  // ---------- AGENCIES (organizations with AGENCY-role users) ----------
  if (type === 'ALL' || type === 'AGENCY') {
    const where = {
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
      users: {
        some: {
          userRoles: {
            some: { role: { name: 'AGENCY' } },
          },
        },
      },
    };

    // Exclude my own org (can't chat with self)
    const myOrgId = user.organizationId;
    if (myOrgId) {
      where.id = { not: myOrgId };
    }

    const orgs = await prisma.organization.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        country: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    results.push(
      ...orgs.map((o) => ({
        type: 'ORG',
        id: o.id,
        displayName: o.name,
        handle: null,
        avatarUrl: o.logoUrl,
        subtitle: o.country ? `${o.country} · Agency` : 'Agency',
        slug: o.slug,
      }))
    );
  }

  return { parties: results.slice(0, limit) };
}

module.exports = { searchParties };