const prisma = require('../../config/prisma');
const { shapeInfluencer, httpError } = require('./helpers');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function getInfluencer(user, idOrSlug) {
  const isUuid = UUID_RE.test(idOrSlug);

  const influencer = await prisma.influencer.findFirst({
    where: isUuid ? { id: idOrSlug } : { slug: idOrSlug },
    include: { socialAccounts: true, audienceMetrics: true },
  });

  if (!influencer) {
    throw httpError('Influencer not found', 404);
  }

  let savedSet = null;
  if (user.organizationId) {
    const savedRow = await prisma.organizationInfluencer.findUnique({
      where: {
        organizationId_influencerId: {
          organizationId: user.organizationId,
          influencerId: influencer.id,
        },
      },
    });
    savedSet = new Set(savedRow ? [influencer.id] : []);
  }

  return shapeInfluencer(influencer, savedSet);
}

/**
 * Get the logged-in user's own influencer profile.
 *
 * Handles three cases:
 *   1. Profile already linked by userId → return it
 *   2. Orphan profile exists (userId null, matched by email) → link + return
 *   3. Orphan exists with the deterministic username → adopt it
 *   4. Nothing found → create fresh with userId linked
 */
async function getMyInfluencerProfile(user) {
  const include = { socialAccounts: true, audienceMetrics: true };

  // 1. Already linked
  let influencer = await prisma.influencer.findUnique({
    where: { userId: user.id },
    include,
  });
  if (influencer) {
    return shapeInfluencer(influencer);
  }

  // 2. Orphan matched by email → link
  if (user.email) {
    const orphan = await prisma.influencer.findFirst({
      where: { email: user.email, userId: null },
      include,
    });
    if (orphan) {
      const linked = await prisma.influencer.update({
        where: { id: orphan.id },
        data: { userId: user.id },
        include,
      });
      return shapeInfluencer(linked);
    }
  }

  // 3. Compute the deterministic username we'd use
  const baseUsername = (user.email?.split('@')[0] || 'creator')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
  const uniqueUsername = `${baseUsername}${user.id.slice(0, 4)}`;

  // 3a. Orphan matched by username → adopt
  const byUsername = await prisma.influencer.findUnique({
    where: { username: uniqueUsername },
    include,
  });
  if (byUsername && byUsername.userId === null) {
    const linked = await prisma.influencer.update({
      where: { id: byUsername.id },
      data: {
        userId: user.id,
        email: user.email || byUsername.email,
      },
      include,
    });
    return shapeInfluencer(linked);
  }

  // 3b. Username taken by ANOTHER user → append random to make it unique
  let finalUsername = uniqueUsername;
  if (byUsername && byUsername.userId !== null) {
    finalUsername = `${uniqueUsername}${Math.random().toString(36).slice(2, 6)}`;
  }

  // 4. Nothing to adopt → create fresh
  const { createInfluencer } = require('./create');
  return await createInfluencer(user, {
    userId: user.id,
    displayName: user.name || 'New Creator',
    username: finalUsername,
    email: user.email || null,
    bio: '',
    categories: [],
  });
}

module.exports = { getInfluencer, getMyInfluencerProfile };