// services/agency/engagement.js

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { notifyUser } = require('../notifications');
const { writeAudit } = require('../admin/helpers');
const {
  emitEngagementCreated,
  emitEngagementUpdated,
  emitOfferUpdated,
} = require('../websocket/broadcast');

const VALID_SERVICE_TYPES = [
  'BRAND_SYSTEM_MANAGEMENT',
  'BRAND_WEBSITE',
  'BRAND_CAMPAIGN_OPS',
  'INFLUENCER_PHOTOSHOOT',
  'INFLUENCER_VIDEOGRAPHY',
];

function assertServiceTypeForClient(serviceType, clientType) {
  if (!VALID_SERVICE_TYPES.includes(serviceType)) {
    throw httpError(`Invalid service type: ${serviceType}`, 400, 'INVALID_SERVICE');
  }
  const isBrandService = serviceType.startsWith('BRAND_');
  if (clientType === 'BRAND' && !isBrandService) {
    throw httpError('This service is only available for influencers', 400, 'SERVICE_MISMATCH');
  }
  if (clientType === 'INFLUENCER' && isBrandService) {
    throw httpError('This service is only available for brands', 400, 'SERVICE_MISMATCH');
  }
}

// ======================================================
// CREATE ENGAGEMENT (client → agency)
// ======================================================
async function createEngagement(user, payload = {}) {
  const {
    agencyOrganizationId,
    serviceType,
    title,
    description,
    budget,
    currency = 'PKR',
    deadline,
    deliverables,
    notes,
  } = payload;

  if (!agencyOrganizationId) throw httpError('agencyOrganizationId is required', 400, 'MISSING_AGENCY');
  if (!serviceType) throw httpError('serviceType is required', 400, 'MISSING_SERVICE');
  if (!title || !String(title).trim()) throw httpError('title is required', 400, 'MISSING_TITLE');
  if (!budget || Number(budget) <= 0) throw httpError('budget must be positive', 400, 'INVALID_BUDGET');

  const roles = user.roles || [];
  const isInfluencer = roles.includes('INFLUENCER');
  const isBrand = roles.includes('BRAND_OWNER') || roles.includes('BRAND_TEAM_MEMBER') || roles.includes('AGENCY');

  let clientType = null;
  let brandId = null;
  let influencerId = null;

  if (isInfluencer) {
    clientType = 'INFLUENCER';
    const inf = await prisma.influencer.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!inf) throw httpError('Influencer profile not found', 404, 'NO_INFLUENCER');
    influencerId = inf.id;
  } else if (isBrand) {
    clientType = 'BRAND';
    if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
    const brand = await prisma.brand.findFirst({
      where: { organizationId: user.organizationId },
      select: { id: true },
    });
    if (!brand) throw httpError('No brand found in your org', 404, 'NO_BRAND');
    brandId = brand.id;
  } else {
    throw httpError('Only brands or influencers can hire agencies', 403, 'FORBIDDEN');
  }

  assertServiceTypeForClient(serviceType, clientType);

  const agencyProfile = await prisma.agencyProfile.findUnique({
    where: { organizationId: agencyOrganizationId },
  });
  if (!agencyProfile) throw httpError('Agency not found', 404, 'AGENCY_NOT_FOUND');
  if (!agencyProfile.serviceTypes.includes(serviceType)) {
    throw httpError('Agency does not offer this service', 400, 'SERVICE_NOT_OFFERED');
  }
  if (!agencyProfile.isAcceptingNew) {
    throw httpError('Agency is not accepting new engagements', 400, 'NOT_ACCEPTING');
  }

  const engagement = await prisma.agencyEngagement.create({
    data: {
      agencyOrganizationId,
      clientType,
      brandId,
      influencerId,
      hiredByUserId: user.id,
      serviceType,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      budget: Number(budget),
      currency: String(currency || 'PKR').toUpperCase(),
      deadline: deadline ? new Date(deadline) : null,
      deliverables: deliverables || undefined,
      notes: notes ? String(notes).trim() : null,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.create',
    targetType: 'AgencyEngagement',
    targetId: engagement.id,
    meta: { clientType, serviceType, agencyOrganizationId },
  });

  const agencyUsers = await prisma.user.findMany({
    where: { organizationId: agencyOrganizationId, isActive: true },
    select: { id: true },
  });
  for (const u of agencyUsers) {
    await notifyUser(u.id, {
      type: 'SYSTEM',
      title: 'New engagement request',
      body: `${title} — ${clientType === 'BRAND' ? 'Brand' : 'Influencer'} wants to hire you.`,
      link: `/agency/engagements`,
      meta: { engagementId: engagement.id },
    }).catch(() => {});
  }

  // ✅ Real-time: notify agency users
  await emitEngagementCreated(engagement).catch(() => {});

  return shapeEngagement(engagement);
}

// ======================================================
// ACCEPT (agency)
// ======================================================
async function acceptEngagement(user, engagementId, payload = {}) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
  if (user.organizationId !== engagement.agencyOrganizationId) {
    throw httpError('Only the agency can accept', 403, 'NOT_AGENCY');
  }
  if (engagement.status !== 'PENDING') {
    throw httpError(`Cannot accept in status "${engagement.status}"`, 400, 'INVALID_STATUS');
  }

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      status: 'ACCEPTED',
      acceptedAt: new Date(),
      agencyNote: payload.note ? String(payload.note).trim() : null,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.accept',
    targetType: 'AgencyEngagement',
    targetId: engagementId,
  });

  await notifyUser(engagement.hiredByUserId, {
    type: 'SYSTEM',
    title: 'Engagement accepted',
    body: `Your request "${engagement.title}" was accepted.`,
    link: `/engagements`,
    meta: { engagementId },
  }).catch(() => {});

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'accepted').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// REJECT (agency)
// ======================================================
async function rejectEngagement(user, engagementId, payload = {}) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
  if (user.organizationId !== engagement.agencyOrganizationId) {
    throw httpError('Only the agency can reject', 403, 'NOT_AGENCY');
  }
  if (engagement.status !== 'PENDING') {
    throw httpError(`Cannot reject in status "${engagement.status}"`, 400, 'INVALID_STATUS');
  }

  const reason = payload.reason ? String(payload.reason).trim() : 'Not specified';

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
      agencyNote: payload.note ? String(payload.note).trim() : null,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.reject',
    targetType: 'AgencyEngagement',
    targetId: engagementId,
    meta: { reason },
  });

  await notifyUser(engagement.hiredByUserId, {
    type: 'SYSTEM',
    title: 'Engagement declined',
    body: `"${engagement.title}" was declined. Reason: ${reason}`,
    link: `/engagements`,
    meta: { engagementId },
  }).catch(() => {});

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'rejected').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// START WORK (agency)
// ======================================================
async function startEngagement(user, engagementId) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
  if (user.organizationId !== engagement.agencyOrganizationId) {
    throw httpError('Only the agency can start', 403, 'NOT_AGENCY');
  }
  if (engagement.status !== 'ACCEPTED') {
    throw httpError(`Cannot start in status "${engagement.status}"`, 400, 'INVALID_STATUS');
  }

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: { status: 'IN_PROGRESS', startedAt: new Date() },
  });

  await notifyUser(engagement.hiredByUserId, {
    type: 'SYSTEM',
    title: 'Work started',
    body: `"${engagement.title}" is now in progress.`,
    link: `/engagements`,
    meta: { engagementId },
  }).catch(() => {});

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'started').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// COMPLETE (agency)
// ======================================================
async function completeEngagement(user, engagementId, payload = {}) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
  if (user.organizationId !== engagement.agencyOrganizationId) {
    throw httpError('Only the agency can complete', 403, 'NOT_AGENCY');
  }
  if (!['ACCEPTED', 'IN_PROGRESS', 'DELIVERED'].includes(engagement.status)) {
    throw httpError(`Cannot complete in status "${engagement.status}"`, 400, 'INVALID_STATUS');
  }

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      status: 'COMPLETED',
      completedAt: new Date(),
      agencyNote: payload.note ? String(payload.note).trim() : engagement.agencyNote,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.complete',
    targetType: 'AgencyEngagement',
    targetId: engagementId,
  });

  await notifyUser(engagement.hiredByUserId, {
    type: 'SYSTEM',
    title: 'Engagement completed',
    body: `"${engagement.title}" has been delivered.`,
    link: `/engagements`,
    meta: { engagementId },
  }).catch(() => {});

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'completed').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// CANCEL (client)
// ======================================================
async function cancelEngagement(user, engagementId, payload = {}) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
  if (engagement.hiredByUserId !== user.id) {
    throw httpError('Only the requester can cancel', 403, 'FORBIDDEN');
  }
  if (['COMPLETED', 'CANCELLED'].includes(engagement.status)) {
    throw httpError(`Cannot cancel in status "${engagement.status}"`, 400, 'INVALID_STATUS');
  }

  const reason = payload.reason ? String(payload.reason).trim() : 'Cancelled by requester';

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      status: 'CANCELLED',
      cancelledAt: new Date(),
      cancelReason: reason,
    },
  });

  const agencyUsers = await prisma.user.findMany({
    where: { organizationId: engagement.agencyOrganizationId, isActive: true },
    select: { id: true },
  });
  for (const u of agencyUsers) {
    await notifyUser(u.id, {
      type: 'SYSTEM',
      title: 'Engagement cancelled',
      body: `"${engagement.title}" was cancelled. Reason: ${reason}`,
      link: `/agency/engagements`,
      meta: { engagementId },
    }).catch(() => {});
  }

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'cancelled').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// LIST — agency inbox
// ======================================================
async function listAgencyInbox(user, query = {}) {
  if (!user.roles?.includes('AGENCY')) {
    throw httpError('Only agencies can view inbox', 403, 'NOT_AGENCY');
  }
  const where = { agencyOrganizationId: user.organizationId };
  if (query.status) where.status = query.status;

  const items = await prisma.agencyEngagement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(query.limit) || 50, 100),
  });

  return { engagements: items.map(shapeEngagement) };
}

// ======================================================
// LIST — my sent requests
// ======================================================
async function listMyEngagements(user, query = {}) {
  const where = { hiredByUserId: user.id };
  if (query.status) where.status = query.status;

  const items = await prisma.agencyEngagement.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: Math.min(Number(query.limit) || 50, 100),
  });

  const orgIds = [...new Set(items.map((e) => e.agencyOrganizationId))];
  const orgs = orgIds.length
    ? await prisma.organization.findMany({
        where: { id: { in: orgIds } },
        select: { id: true, name: true, slug: true },
      })
    : [];
  const orgMap = new Map(orgs.map((o) => [o.id, o]));

  return {
    engagements: items.map((e) => ({
      ...shapeEngagement(e),
      agencyOrganization: orgMap.get(e.agencyOrganizationId) || null,
    })),
  };
}

// ======================================================
// GET ONE
// ======================================================
async function getEngagement(user, engagementId) {
  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

  const isAgency = user.organizationId === engagement.agencyOrganizationId;
  const isClient = engagement.hiredByUserId === user.id;
  const isAdmin = user.roles?.includes('SUPER_ADMIN');

  if (!isAgency && !isClient && !isAdmin) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }

  return shapeEngagement(engagement);
}

// ======================================================
// AGENCY — Upload deliverable files
// ======================================================
async function uploadAgencyDeliverable(user, engagementId, payload = {}) {
  const { files, notes } = payload;

  const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

  if (user.organizationId !== engagement.agencyOrganizationId) {
    throw httpError('Only the agency can upload deliverables', 403, 'NOT_AGENCY');
  }
  if (!['ACCEPTED', 'IN_PROGRESS'].includes(engagement.status)) {
    throw httpError(
      `Cannot upload in status "${engagement.status}"`,
      400,
      'INVALID_STATUS'
    );
  }
  if (!Array.isArray(files) || files.length === 0) {
    throw httpError('At least one file is required', 400, 'NO_FILES');
  }

  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      deliverableFiles: files,
      deliveredAt: new Date(),
      status: 'DELIVERED',
      agencyNote: notes ? String(notes).trim() : engagement.agencyNote,
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.deliverable_upload',
    targetType: 'AgencyEngagement',
    targetId: engagementId,
    meta: { filesCount: files.length },
  });

  await notifyUser(engagement.hiredByUserId, {
    type: 'SYSTEM',
    title: 'Agency delivered your content',
    body: `"${engagement.title}" — ${files.length} file(s) ready. You can now use this in your campaign.`,
    link: `/engagements`,
    meta: { engagementId },
  }).catch(() => {});

  // ✅ Real-time
  await emitEngagementUpdated(updated, 'delivered').catch(() => {});

  return shapeEngagement(updated);
}

// ======================================================
// INFLUENCER — Link engagement to campaign
// Auto-creates a FINAL ContentSubmission so brand sees it in normal pipeline
// ======================================================
async function linkEngagementToCampaign(user, engagementId, payload = {}) {
  const { campaignId, deliverableId } = payload;

  const engagement = await prisma.agencyEngagement.findUnique({
    where: { id: engagementId },
  });
  if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

  if (engagement.hiredByUserId !== user.id) {
    throw httpError('Only the requester can link', 403, 'FORBIDDEN');
  }
  if (engagement.status !== 'DELIVERED') {
    throw httpError(
      `Agency hasn't delivered yet (status: ${engagement.status})`,
      400,
      'NOT_DELIVERED'
    );
  }
  if (!engagement.deliverableFiles || !Array.isArray(engagement.deliverableFiles)) {
    throw httpError('No deliverable files found', 400, 'NO_FILES');
  }

  // Validate campaign + deliverable
  const deliverable = await prisma.campaignDeliverable.findUnique({
    where: { id: deliverableId },
    include: { campaign: { include: { influencer: true, brand: true } } },
  });
  if (!deliverable) throw httpError('Campaign deliverable not found', 404, 'NO_DELIVERABLE');

  if (deliverable.campaign.influencer.userId !== user.id) {
    throw httpError('You do not have access to this campaign', 403, 'FORBIDDEN');
  }

  // ---- 1. Auto-create FINAL submission from agency files ----
  const submission = await prisma.contentSubmission.create({
    data: {
      deliverableId,
      files: engagement.deliverableFiles,
      caption: null,
      notes: engagement.agencyNote
        ? `Final content delivered — ${engagement.agencyNote}`
        : 'Final content delivered',
      stage: 'FINAL',
      status: 'PENDING',
      submittedBy: user.id,
      submittedByRole: 'INFLUENCER',
      submittedByAgencyId: null,
    },
  });

  // ---- 2. Update campaign deliverable status ----
  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'FINAL_UPLOADED' },
  });

  // ---- 3. Update engagement ----
  const updated = await prisma.agencyEngagement.update({
    where: { id: engagementId },
    data: {
      linkedCampaignId: campaignId || deliverable.campaign.id,
      linkedDeliverableId: deliverableId,
      forwardedAt: new Date(),
      status: 'COMPLETED',
      completedAt: new Date(),
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'agency.engagement.link_campaign',
    targetType: 'AgencyEngagement',
    targetId: engagementId,
    meta: { campaignId, deliverableId, submissionId: submission.id },
  });

  // ---- 4. Notify brand owner ----
  const brandOwner = await prisma.user.findFirst({
    where: {
      organizationId: deliverable.campaign.brand.organizationId,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
  if (brandOwner?.id) {
    await notifyUser(brandOwner.id, {
      type: 'SYSTEM',
      title: 'Final content ready for approval',
      body: `"${deliverable.campaign.title}" — creator submitted final content for review.`,
      link: `/campaigns/${deliverable.campaign.id}?tab=deliverables`,
      meta: { campaignId: deliverable.campaign.id, deliverableId },
    }).catch(() => {});
  }

  // ✅ Real-time: engagement now COMPLETED
  await emitEngagementUpdated(updated, 'completed').catch(() => {});

  // ✅ Real-time: notify brand + influencer that the linked offer is COMPLETED
  try {
    const linkedCampaign = await prisma.campaign.findUnique({
      where: { id: deliverable.campaign.id },
      include: { brand: true, influencer: true, offer: true },
    });
    if (linkedCampaign?.offer) {
      await emitOfferUpdated(
        {
          ...linkedCampaign.offer,
          brand: linkedCampaign.brand,
          influencer: linkedCampaign.influencer,
        },
        'completed'
      ).catch(() => {});
    }
  } catch (e) {
    console.warn('[emitOfferUpdated after link] failed:', e.message);
  }

  return shapeEngagement(updated);
}

// ======================================================
// SHAPING
// ======================================================
function shapeEngagement(e) {
  return {
    id: e.id,
    agencyOrganizationId: e.agencyOrganizationId,
    clientType: e.clientType,
    brandId: e.brandId,
    influencerId: e.influencerId,
    hiredByUserId: e.hiredByUserId,
    serviceType: e.serviceType,
    status: e.status,
    title: e.title,
    description: e.description,
    budget: Number(e.budget),
    currency: e.currency,
    deadline: e.deadline,
    deliverables: e.deliverables,
    notes: e.notes,
    agencyNote: e.agencyNote,
    // Bridge fields
    deliverableFiles: e.deliverableFiles ?? null,
    deliveredAt: e.deliveredAt ?? null,
    linkedCampaignId: e.linkedCampaignId ?? null,
    linkedDeliverableId: e.linkedDeliverableId ?? null,
    forwardedAt: e.forwardedAt ?? null,
    // Timeline
    acceptedAt: e.acceptedAt,
    startedAt: e.startedAt,
    completedAt: e.completedAt,
    cancelledAt: e.cancelledAt,
    cancelReason: e.cancelReason,
    createdAt: e.createdAt,
    updatedAt: e.updatedAt,
  };
}

module.exports = {
  createEngagement,
  acceptEngagement,
  rejectEngagement,
  startEngagement,
  completeEngagement,
  cancelEngagement,
  listAgencyInbox,
  listMyEngagements,
  getEngagement,
  uploadAgencyDeliverable,
  linkEngagementToCampaign,
  shapeEngagement,
};






// 07-10-2026     10:03
// // services/agency/engagement.js

// const prisma = require('../../config/prisma');
// const { httpError } = require('../influencer/helpers');
// const { notifyUser } = require('../notifications');
// const { writeAudit } = require('../admin/helpers');
// const {
//   emitEngagementCreated,
//   emitEngagementUpdated,
// } = require('../websocket/broadcast');

// const VALID_SERVICE_TYPES = [
//   'BRAND_SYSTEM_MANAGEMENT',
//   'BRAND_WEBSITE',
//   'BRAND_CAMPAIGN_OPS',
//   'INFLUENCER_PHOTOSHOOT',
//   'INFLUENCER_VIDEOGRAPHY',
// ];

// function assertServiceTypeForClient(serviceType, clientType) {
//   if (!VALID_SERVICE_TYPES.includes(serviceType)) {
//     throw httpError(`Invalid service type: ${serviceType}`, 400, 'INVALID_SERVICE');
//   }
//   const isBrandService = serviceType.startsWith('BRAND_');
//   if (clientType === 'BRAND' && !isBrandService) {
//     throw httpError('This service is only available for influencers', 400, 'SERVICE_MISMATCH');
//   }
//   if (clientType === 'INFLUENCER' && isBrandService) {
//     throw httpError('This service is only available for brands', 400, 'SERVICE_MISMATCH');
//   }
// }

// // ======================================================
// // CREATE ENGAGEMENT (client → agency)
// // ======================================================
// async function createEngagement(user, payload = {}) {
//   const {
//     agencyOrganizationId,
//     serviceType,
//     title,
//     description,
//     budget,
//     currency = 'PKR',
//     deadline,
//     deliverables,
//     notes,
//   } = payload;

//   if (!agencyOrganizationId) throw httpError('agencyOrganizationId is required', 400, 'MISSING_AGENCY');
//   if (!serviceType) throw httpError('serviceType is required', 400, 'MISSING_SERVICE');
//   if (!title || !String(title).trim()) throw httpError('title is required', 400, 'MISSING_TITLE');
//   if (!budget || Number(budget) <= 0) throw httpError('budget must be positive', 400, 'INVALID_BUDGET');

//   const roles = user.roles || [];
//   const isInfluencer = roles.includes('INFLUENCER');
//   const isBrand = roles.includes('BRAND_OWNER') || roles.includes('BRAND_TEAM_MEMBER') || roles.includes('AGENCY');

//   let clientType = null;
//   let brandId = null;
//   let influencerId = null;

//   if (isInfluencer) {
//     clientType = 'INFLUENCER';
//     const inf = await prisma.influencer.findUnique({
//       where: { userId: user.id },
//       select: { id: true },
//     });
//     if (!inf) throw httpError('Influencer profile not found', 404, 'NO_INFLUENCER');
//     influencerId = inf.id;
//   } else if (isBrand) {
//     clientType = 'BRAND';
//     if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
//     const brand = await prisma.brand.findFirst({
//       where: { organizationId: user.organizationId },
//       select: { id: true },
//     });
//     if (!brand) throw httpError('No brand found in your org', 404, 'NO_BRAND');
//     brandId = brand.id;
//   } else {
//     throw httpError('Only brands or influencers can hire agencies', 403, 'FORBIDDEN');
//   }

//   assertServiceTypeForClient(serviceType, clientType);

//   const agencyProfile = await prisma.agencyProfile.findUnique({
//     where: { organizationId: agencyOrganizationId },
//   });
//   if (!agencyProfile) throw httpError('Agency not found', 404, 'AGENCY_NOT_FOUND');
//   if (!agencyProfile.serviceTypes.includes(serviceType)) {
//     throw httpError('Agency does not offer this service', 400, 'SERVICE_NOT_OFFERED');
//   }
//   if (!agencyProfile.isAcceptingNew) {
//     throw httpError('Agency is not accepting new engagements', 400, 'NOT_ACCEPTING');
//   }

//   const engagement = await prisma.agencyEngagement.create({
//     data: {
//       agencyOrganizationId,
//       clientType,
//       brandId,
//       influencerId,
//       hiredByUserId: user.id,
//       serviceType,
//       title: String(title).trim(),
//       description: description ? String(description).trim() : null,
//       budget: Number(budget),
//       currency: String(currency || 'PKR').toUpperCase(),
//       deadline: deadline ? new Date(deadline) : null,
//       deliverables: deliverables || undefined,
//       notes: notes ? String(notes).trim() : null,
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.create',
//     targetType: 'AgencyEngagement',
//     targetId: engagement.id,
//     meta: { clientType, serviceType, agencyOrganizationId },
//   });

//   const agencyUsers = await prisma.user.findMany({
//     where: { organizationId: agencyOrganizationId, isActive: true },
//     select: { id: true },
//   });
//   for (const u of agencyUsers) {
//     await notifyUser(u.id, {
//       type: 'SYSTEM',
//       title: 'New engagement request',
//       body: `${title} — ${clientType === 'BRAND' ? 'Brand' : 'Influencer'} wants to hire you.`,
//       link: `/agency/engagements`,
//       meta: { engagementId: engagement.id },
//     }).catch(() => {});
//   }
//   await emitEngagementCreated(engagement).catch(() => {});

//     await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//     await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }


//   return shapeEngagement(engagement);
// }

// // ======================================================
// // ACCEPT (agency)
// // ======================================================
// async function acceptEngagement(user, engagementId, payload = {}) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
//   if (user.organizationId !== engagement.agencyOrganizationId) {
//     throw httpError('Only the agency can accept', 403, 'NOT_AGENCY');
//   }
//   if (engagement.status !== 'PENDING') {
//     throw httpError(`Cannot accept in status "${engagement.status}"`, 400, 'INVALID_STATUS');
//   }

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       status: 'ACCEPTED',
//       acceptedAt: new Date(),
//       agencyNote: payload.note ? String(payload.note).trim() : null,
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.accept',
//     targetType: 'AgencyEngagement',
//     targetId: engagementId,
//   });

//   await notifyUser(engagement.hiredByUserId, {
//     type: 'SYSTEM',
//     title: 'Engagement accepted',
//     body: `Your request "${engagement.title}" was accepted.`,
//     link: `/engagements`,
//     meta: { engagementId },
//   }).catch(() => {});

//   await emitEngagementCreated(engagement).catch(() => {});
//     await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//     await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   return shapeEngagement(updated);
// }

// // ======================================================
// // REJECT (agency)
// // ======================================================
// async function rejectEngagement(user, engagementId, payload = {}) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
//   if (user.organizationId !== engagement.agencyOrganizationId) {
//     throw httpError('Only the agency can reject', 403, 'NOT_AGENCY');
//   }
//   if (engagement.status !== 'PENDING') {
//     throw httpError(`Cannot reject in status "${engagement.status}"`, 400, 'INVALID_STATUS');
//   }

//   const reason = payload.reason ? String(payload.reason).trim() : 'Not specified';

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       status: 'CANCELLED',
//       cancelledAt: new Date(),
//       cancelReason: reason,
//       agencyNote: payload.note ? String(payload.note).trim() : null,
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.reject',
//     targetType: 'AgencyEngagement',
//     targetId: engagementId,
//     meta: { reason },
//   });

//   await notifyUser(engagement.hiredByUserId, {
//     type: 'SYSTEM',
//     title: 'Engagement declined',
//     body: `"${engagement.title}" was declined. Reason: ${reason}`,
//     link: `/engagements`,
//     meta: { engagementId },
//   }).catch(() => {});
//   await emitEngagementCreated(engagement).catch(() => {});
//     await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//     await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }



//   return shapeEngagement(updated);
// }

// // ======================================================
// // START WORK (agency)
// // ======================================================
// async function startEngagement(user, engagementId) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
//   if (user.organizationId !== engagement.agencyOrganizationId) {
//     throw httpError('Only the agency can start', 403, 'NOT_AGENCY');
//   }
//   if (engagement.status !== 'ACCEPTED') {
//     throw httpError(`Cannot start in status "${engagement.status}"`, 400, 'INVALID_STATUS');
//   }

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: { status: 'IN_PROGRESS', startedAt: new Date() },
//   });

//   await notifyUser(engagement.hiredByUserId, {
//     type: 'SYSTEM',
//     title: 'Work started',
//     body: `"${engagement.title}" is now in progress.`,
//     link: `/engagements`,
//     meta: { engagementId },
//   }).catch(() => {});

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }


//   return shapeEngagement(updated);
// }

// // ======================================================
// // COMPLETE (agency)
// // ======================================================
// async function completeEngagement(user, engagementId, payload = {}) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
//   if (user.organizationId !== engagement.agencyOrganizationId) {
//     throw httpError('Only the agency can complete', 403, 'NOT_AGENCY');
//   }
//   if (!['ACCEPTED', 'IN_PROGRESS', 'DELIVERED'].includes(engagement.status)) {
//     throw httpError(`Cannot complete in status "${engagement.status}"`, 400, 'INVALID_STATUS');
//   }

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       status: 'COMPLETED',
//       completedAt: new Date(),
//       agencyNote: payload.note ? String(payload.note).trim() : engagement.agencyNote,
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.complete',
//     targetType: 'AgencyEngagement',
//     targetId: engagementId,
//   });

//   await notifyUser(engagement.hiredByUserId, {
//     type: 'SYSTEM',
//     title: 'Engagement completed',
//     body: `"${engagement.title}" has been delivered.`,
//     link: `/engagements`,
//     meta: { engagementId },
//   }).catch(() => {});

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

  


//   return shapeEngagement(updated);
// }

// // ======================================================
// // CANCEL (client)
// // ======================================================
// async function cancelEngagement(user, engagementId, payload = {}) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');
//   if (engagement.hiredByUserId !== user.id) {
//     throw httpError('Only the requester can cancel', 403, 'FORBIDDEN');
//   }
//   if (['COMPLETED', 'CANCELLED'].includes(engagement.status)) {
//     throw httpError(`Cannot cancel in status "${engagement.status}"`, 400, 'INVALID_STATUS');
//   }

//   const reason = payload.reason ? String(payload.reason).trim() : 'Cancelled by requester';

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       status: 'CANCELLED',
//       cancelledAt: new Date(),
//       cancelReason: reason,
//     },
//   });

//   const agencyUsers = await prisma.user.findMany({
//     where: { organizationId: engagement.agencyOrganizationId, isActive: true },
//     select: { id: true },
//   });
//   for (const u of agencyUsers) {
//     await notifyUser(u.id, {
//       type: 'SYSTEM',
//       title: 'Engagement cancelled',
//       body: `"${engagement.title}" was cancelled. Reason: ${reason}`,
//       link: `/agency/engagements`,
//       meta: { engagementId },
//     }).catch(() => {});
//   }

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   return shapeEngagement(updated);
// }

// // ======================================================
// // LIST — agency inbox
// // ======================================================
// async function listAgencyInbox(user, query = {}) {
//   if (!user.roles?.includes('AGENCY')) {
//     throw httpError('Only agencies can view inbox', 403, 'NOT_AGENCY');
//   }
//   const where = { agencyOrganizationId: user.organizationId };
//   if (query.status) where.status = query.status;

//   const items = await prisma.agencyEngagement.findMany({
//     where,
//     orderBy: { createdAt: 'desc' },
//     take: Math.min(Number(query.limit) || 50, 100),
//   });

//   return { engagements: items.map(shapeEngagement) };
// }

// // ======================================================
// // LIST — my sent requests
// // ======================================================
// async function listMyEngagements(user, query = {}) {
//   const where = { hiredByUserId: user.id };
//   if (query.status) where.status = query.status;

//   const items = await prisma.agencyEngagement.findMany({
//     where,
//     orderBy: { createdAt: 'desc' },
//     take: Math.min(Number(query.limit) || 50, 100),
//   });

//   const orgIds = [...new Set(items.map((e) => e.agencyOrganizationId))];
//   const orgs = orgIds.length
//     ? await prisma.organization.findMany({
//         where: { id: { in: orgIds } },
//         select: { id: true, name: true, slug: true },
//       })
//     : [];
//   const orgMap = new Map(orgs.map((o) => [o.id, o]));

//   return {
//     engagements: items.map((e) => ({
//       ...shapeEngagement(e),
//       agencyOrganization: orgMap.get(e.agencyOrganizationId) || null,
//     })),
//   };
// }

// // ======================================================
// // GET ONE
// // ======================================================
// async function getEngagement(user, engagementId) {
//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

//   const isAgency = user.organizationId === engagement.agencyOrganizationId;
//   const isClient = engagement.hiredByUserId === user.id;
//   const isAdmin = user.roles?.includes('SUPER_ADMIN');

//   if (!isAgency && !isClient && !isAdmin) {
//     throw httpError('Forbidden', 403, 'FORBIDDEN');
//   }

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});

//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   return shapeEngagement(engagement);
// }

// // ======================================================
// // AGENCY — Upload deliverable files
// // ======================================================
// async function uploadAgencyDeliverable(user, engagementId, payload = {}) {
//   const { files, notes } = payload;

//   const engagement = await prisma.agencyEngagement.findUnique({ where: { id: engagementId } });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

//   if (user.organizationId !== engagement.agencyOrganizationId) {
//     throw httpError('Only the agency can upload deliverables', 403, 'NOT_AGENCY');
//   }
//   if (!['ACCEPTED', 'IN_PROGRESS'].includes(engagement.status)) {
//     throw httpError(
//       `Cannot upload in status "${engagement.status}"`,
//       400,
//       'INVALID_STATUS'
//     );
//   }
//   if (!Array.isArray(files) || files.length === 0) {
//     throw httpError('At least one file is required', 400, 'NO_FILES');
//   }

//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       deliverableFiles: files,
//       deliveredAt: new Date(),
//       status: 'DELIVERED',
//       agencyNote: notes ? String(notes).trim() : engagement.agencyNote,
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.deliverable_upload',
//     targetType: 'AgencyEngagement',
//     targetId: engagementId,
//     meta: { filesCount: files.length },
//   });

//   await notifyUser(engagement.hiredByUserId, {
//     type: 'SYSTEM',
//     title: 'Agency delivered your content',
//     body: `"${engagement.title}" — ${files.length} file(s) ready. You can now use this in your campaign.`,
//     link: `/engagements`,
//     meta: { engagementId },
//   }).catch(() => {});

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});
//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   return shapeEngagement(updated);
// }

// // ======================================================
// // INFLUENCER — Link engagement to campaign
// // Auto-creates a FINAL ContentSubmission so brand sees it in normal pipeline
// // ======================================================
// async function linkEngagementToCampaign(user, engagementId, payload = {}) {
//   const { campaignId, deliverableId } = payload;

//   const engagement = await prisma.agencyEngagement.findUnique({
//     where: { id: engagementId },
//   });
//   if (!engagement) throw httpError('Engagement not found', 404, 'NOT_FOUND');

//   if (engagement.hiredByUserId !== user.id) {
//     throw httpError('Only the requester can link', 403, 'FORBIDDEN');
//   }
//   if (engagement.status !== 'DELIVERED') {
//     throw httpError(
//       `Agency hasn't delivered yet (status: ${engagement.status})`,
//       400,
//       'NOT_DELIVERED'
//     );
//   }
//   if (!engagement.deliverableFiles || !Array.isArray(engagement.deliverableFiles)) {
//     throw httpError('No deliverable files found', 400, 'NO_FILES');
//   }

//   // Validate campaign + deliverable
//   const deliverable = await prisma.campaignDeliverable.findUnique({
//     where: { id: deliverableId },
//     include: { campaign: { include: { influencer: true, brand: true } } },
//   });
//   if (!deliverable) throw httpError('Campaign deliverable not found', 404, 'NO_DELIVERABLE');

//   if (deliverable.campaign.influencer.userId !== user.id) {
//     throw httpError('You do not have access to this campaign', 403, 'FORBIDDEN');
//   }

//   // ---- 1. Auto-create FINAL submission from agency files ----
//   const submission = await prisma.contentSubmission.create({
//     data: {
//       deliverableId,
//       files: engagement.deliverableFiles,
//       caption: null,
//       notes: engagement.agencyNote
//         ? `Final content delivered — ${engagement.agencyNote}`
//         : 'Final content delivered',
//       stage: 'FINAL',
//       status: 'PENDING',
//       submittedBy: user.id,
//       submittedByRole: 'INFLUENCER',
//       submittedByAgencyId: null,
//     },
//   });

//   // ---- 2. Update campaign deliverable status ----
//   await prisma.campaignDeliverable.update({
//     where: { id: deliverableId },
//     data: { status: 'FINAL_UPLOADED' },
//   });

//   // ---- 3. Update engagement ----
//   const updated = await prisma.agencyEngagement.update({
//     where: { id: engagementId },
//     data: {
//       linkedCampaignId: campaignId || deliverable.campaign.id,
//       linkedDeliverableId: deliverableId,
//       forwardedAt: new Date(),
//       status: 'COMPLETED',
//       completedAt: new Date(),
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'agency.engagement.link_campaign',
//     targetType: 'AgencyEngagement',
//     targetId: engagementId,
//     meta: { campaignId, deliverableId, submissionId: submission.id },
//   });

//   // ---- 4. Notify brand owner ----
//   const brandOwner = await prisma.user.findFirst({
//     where: {
//       organizationId: deliverable.campaign.brand.organizationId,
//       userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
//     },
//     select: { id: true },
//   });
//   if (brandOwner?.id) {
//     await notifyUser(brandOwner.id, {
//       type: 'SYSTEM',
//       title: 'Final content ready for approval',
//       body: `"${deliverable.campaign.title}" — creator submitted final content for review.`,
//       link: `/campaigns/${deliverable.campaign.id}?tab=deliverables`,
//       meta: { campaignId: deliverable.campaign.id, deliverableId },
//     }).catch(() => {});
//   }

//   await emitEngagementCreated(engagement).catch(() => {});
//   await emitEngagementUpdated(updated, 'accepted').catch(() => {});
//   await emitEngagementUpdated(updated, 'rejected').catch(() => {});
// await emitEngagementUpdated(updated, 'started').catch(() => {});
// await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   await emitEngagementUpdated(updated, 'cancelled').catch(() => {});
//   await emitEngagementUpdated(updated, 'delivered').catch(() => {});
//   await emitEngagementUpdated(updated, 'completed').catch(() => {});
//   // Also notify the campaign's brand about the new FINAL submission
//   const { emitOfferUpdated } = require('../websocket/broadcast');
//   const linkedCampaign = await prisma.campaign.findUnique({
//     where: { id: deliverableId ? deliverable.campaign.id : campaignId },
//     include: { brand: true, influencer: true, offer: true },
//   }).catch(() => null);
//   if (linkedCampaign?.offer) {
//     await emitOfferUpdated(
//       { ...linkedCampaign.offer, brand: linkedCampaign.brand, influencer: linkedCampaign.influencer },
//       'completed'
//     ).catch(() => {});
//   }

//   return shapeEngagement(updated);
// }

// // ======================================================
// // SHAPING
// // ======================================================
// function shapeEngagement(e) {
//   return {
//     id: e.id,
//     agencyOrganizationId: e.agencyOrganizationId,
//     clientType: e.clientType,
//     brandId: e.brandId,
//     influencerId: e.influencerId,
//     hiredByUserId: e.hiredByUserId,
//     serviceType: e.serviceType,
//     status: e.status,
//     title: e.title,
//     description: e.description,
//     budget: Number(e.budget),
//     currency: e.currency,
//     deadline: e.deadline,
//     deliverables: e.deliverables,
//     notes: e.notes,
//     agencyNote: e.agencyNote,
//     // Bridge fields
//     deliverableFiles: e.deliverableFiles ?? null,
//     deliveredAt: e.deliveredAt ?? null,
//     linkedCampaignId: e.linkedCampaignId ?? null,
//     linkedDeliverableId: e.linkedDeliverableId ?? null,
//     forwardedAt: e.forwardedAt ?? null,
//     // Timeline
//     acceptedAt: e.acceptedAt,
//     startedAt: e.startedAt,
//     completedAt: e.completedAt,
//     cancelledAt: e.cancelledAt,
//     cancelReason: e.cancelReason,
//     createdAt: e.createdAt,
//     updatedAt: e.updatedAt,
//   };
// }

// module.exports = {
//   createEngagement,
//   acceptEngagement,
//   rejectEngagement,
//   startEngagement,
//   completeEngagement,
//   cancelEngagement,
//   listAgencyInbox,
//   listMyEngagements,
//   getEngagement,
//   uploadAgencyDeliverable,
//   linkEngagementToCampaign,
//   shapeEngagement,
// };