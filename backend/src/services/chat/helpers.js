// services/chat/helpers.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

// ------------------------------------------------------
// Canonical party ordering — ensures (A,B) === (B,A)
// ------------------------------------------------------
function canonicalize(partyA, partyB) {
  const a = `${partyA.type}:${partyA.id}`;
  const b = `${partyB.type}:${partyB.id}`;
  return a < b ? [partyA, partyB] : [partyB, partyA];
}

// ------------------------------------------------------
// Resolve the caller's party identity (org or influencer)
// ------------------------------------------------------
async function resolveMyParty(user) {
  const isInfluencer = user.roles?.includes('INFLUENCER');
  if (isInfluencer) {
    const inf = await prisma.influencer.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (inf) return { type: 'INFLUENCER', id: inf.id };
  }
  if (user.organizationId) {
    return { type: 'ORG', id: user.organizationId };
  }
  return null;
}

// ------------------------------------------------------
// Which party am I in this conversation?
// ------------------------------------------------------
async function myPartyIn(user, conversation) {
  const me = await resolveMyParty(user);
  if (!me) return null;

  if (conversation.partyAType === me.type && conversation.partyAId === me.id) {
    return { side: 'A', party: me };
  }
  if (conversation.partyBType === me.type && conversation.partyBId === me.id) {
    return { side: 'B', party: me };
  }

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (isAdmin) return { side: 'ADMIN', party: null };

  return null;
}

async function assertCanAccessConversation(user, conversation) {
  const mine = await myPartyIn(user, conversation);
  if (!mine) throw httpError('Forbidden: no access to this conversation', 403, 'FORBIDDEN');
  return mine;
}

// ------------------------------------------------------
// Resolve sender role (BRAND / AGENCY / INFLUENCER / ADMIN)
// ------------------------------------------------------
function resolveSenderRole(user) {
  if (user.roles?.includes('SUPER_ADMIN')) return 'ADMIN';
  if (user.roles?.includes('INFLUENCER')) return 'INFLUENCER';
  if (user.roles?.includes('AGENCY')) return 'AGENCY';
  return 'BRAND';
}

// ------------------------------------------------------
// Shaping — enrich with party info
// ------------------------------------------------------
async function enrichParty(type, id) {
  if (type === 'INFLUENCER') {
    const inf = await prisma.influencer.findUnique({
      where: { id },
      select: {
        id: true, displayName: true, username: true, slug: true,
        avatarUrl: true, country: true, city: true, categories: true,
        followerCount: true, engagementRate: true, currency: true,
      },
    });
    return inf ? { type: 'INFLUENCER', ...inf } : null;
  }
  if (type === 'ORG') {
    const org = await prisma.organization.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, logoUrl: true, country: true },
    });
    if (!org) return null;

    // Check role — org could be agency or brand
    const agencyLink = await prisma.agencyClient.findFirst({
      where: { agencyOrganizationId: id, status: { not: 'COMPLETED' } },
      select: { id: true },
    });

    return {
      type: 'ORG',
      id: org.id,
      name: org.name,
      slug: org.slug,
      logoUrl: org.logoUrl,
      country: org.country,
      isAgency: !!agencyLink,
    };
  }
  return null;
}

// ------------------------------------------------------
// shapeConversation — accepts `user` and returns `mySide`
// so the client knows exactly which party is "them"
// ------------------------------------------------------
async function shapeConversation(c, { user } = {}) {
  const [partyA, partyB] = await Promise.all([
    enrichParty(c.partyAType, c.partyAId),
    enrichParty(c.partyBType, c.partyBId),
  ]);

  // Determine which side the current user is on (A, B, ADMIN, or null)
  let mySide = null;
  if (user) {
    const mine = await myPartyIn(user, c);
    if (mine) mySide = mine.side; // 'A' | 'B' | 'ADMIN'
  }

  return {
    id: c.id,
    contextType: c.contextType,
    partyA: partyA || { type: c.partyAType, id: c.partyAId },
    partyB: partyB || { type: c.partyBType, id: c.partyBId },
    mySide,
    lastMessageAt: c.lastMessageAt,
    lastMessageBody: c.lastMessageBody,
    lastSenderUserId: c.lastSenderUserId,
    unreadForA: c.unreadForA,
    unreadForB: c.unreadForB,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };
}

function shapeDirectMessage(m, { currentUserId } = {}) {
  return {
    id: m.id,
    conversationId: m.conversationId,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole,
    senderPartyType: m.senderPartyType,
    senderPartyId: m.senderPartyId,
    body: m.body,
    attachments: m.attachments,
    isMine: currentUserId ? m.senderUserId === currentUserId : false,
    createdAt: m.createdAt,
  };
}

module.exports = {
  canonicalize,
  resolveMyParty,
  myPartyIn,
  assertCanAccessConversation,
  resolveSenderRole,
  enrichParty,
  shapeConversation,
  shapeDirectMessage,
};