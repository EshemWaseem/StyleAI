// services/campaigns/contentPipeline.js
// ======================================================
// Multi-party content workflow with ITERATION TRACKING
// + Real-time offer/engagement notifications
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { writeAudit } = require('../admin/helpers');
const { notifyUser, notifyAdmins } = require('../notifications');
const {
  assertIsBrandSide, assertIsInfluencerSide, assertIsAgencySide,
  shapeDeliverable,
} = require('./helpers');
const { emitOfferUpdated } = require('../websocket/broadcast');

// ======================================================
// Load deliverable + campaign with auth info
// ======================================================
async function loadDeliverableAuth(deliverableId) {
  const d = await prisma.campaignDeliverable.findUnique({
    where: { id: deliverableId },
    include: {
      campaign: {
        include: { brand: true, influencer: true, agency: true },
      },
      submissions: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!d) throw httpError('Deliverable not found', 404, 'NOT_FOUND');
  return d;
}

async function findBrandOwnerUserId(campaign) {
  if (!campaign?.brand?.organizationId) return null;
  const owner = await prisma.user.findFirst({
    where: {
      organizationId: campaign.brand.organizationId,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
  return owner?.id || null;
}

// ======================================================
// Version-aware submission creation
// ======================================================
async function createVersionedSubmission(data) {
  return prisma.$transaction(async (tx) => {
    const previous = await tx.contentSubmission.findMany({
      where: { deliverableId: data.deliverableId, stage: data.stage },
      orderBy: { iteration: 'desc' },
      take: 1,
    });

    const nextIteration = (previous[0]?.iteration ?? 0) + 1;

    await tx.contentSubmission.updateMany({
      where: { deliverableId: data.deliverableId, stage: data.stage },
      data: { isLatest: false },
    });

    return tx.contentSubmission.create({
      data: {
        ...data,
        iteration: nextIteration,
        isLatest: true,
      },
    });
  });
}

// ======================================================
// Helper — emit offer update (non-blocking, silent)
// ======================================================
async function safeEmitOffer(offerId, eventType) {
  try {
    const offer = await prisma.customOffer.findUnique({
      where: { id: offerId },
      include: { brand: true, influencer: true },
    });
    if (offer) {
      await emitOfferUpdated(offer, eventType).catch(() => {});
    }
  } catch (e) {
    console.warn('[contentPipeline] safeEmitOffer failed:', e.message);
  }
}

// ======================================================
// 1. INFLUENCER — submit RAW
// ======================================================
async function submitRawContent(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);
  assertIsInfluencerSide(user, d.campaign);

  const { files, caption, notes } = payload;
  if (!Array.isArray(files) || files.length === 0) {
    throw httpError('At least one file is required', 400, 'NO_FILES');
  }

  const allowed = ['PENDING', 'IN_PROGRESS', 'CHANGES_REQUESTED', 'BRAND_REJECTED'];
  if (!allowed.includes(d.status)) {
    throw httpError(
      `Cannot submit raw content in status "${d.status}"`,
      400, 'INVALID_STATUS'
    );
  }

  const submission = await createVersionedSubmission({
    deliverableId,
    files,
    caption: caption ?? null,
    notes: notes ?? null,
    stage: 'RAW',
    status: 'PENDING',
    submittedBy: user.id,
    submittedByRole: 'INFLUENCER',
  });

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'RAW_UPLOADED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.raw.submit',
    targetType: 'ContentSubmission',
    targetId: submission.id,
    meta: { deliverableId, filesCount: files.length, iteration: submission.iteration },
  });

  // ✅ Auto-mark linked offer as COMPLETED
  try {
    await prisma.customOffer.update({
      where: { id: d.campaign.offerId },
      data: { status: 'COMPLETED' },
    });
    console.log(`[contentPipeline] Offer ${d.campaign.offerId} auto-marked COMPLETED`);

    // ✅ Real-time: notify brand + influencer that offer is now COMPLETED
    await safeEmitOffer(d.campaign.offerId, 'completed');
  } catch (e) {
    console.warn('[contentPipeline] could not auto-complete offer:', e.message);
  }

  if (d.campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: d.campaign.agencyId, isActive: true },
      select: { id: true },
    });
    for (const u of agencyUsers) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: submission.iteration > 1
          ? `Raw v${submission.iteration} ready to edit`
          : 'Raw content ready to edit',
        body: `${d.campaign.influencer.displayName} uploaded raw v${submission.iteration} for "${d.campaign.title}".`,
        link: `/campaigns/${d.campaign.id}?tab=deliverables`,
        meta: { campaignId: d.campaign.id, deliverableId, iteration: submission.iteration },
      });
    }
  }

  const brandOwnerId = await findBrandOwnerUserId(d.campaign);
  if (d.campaign.brand && brandOwnerId) {
    await notifyUser(brandOwnerId, {
      type: 'SYSTEM',
      title: 'Influencer uploaded raw content',
      body: `Raw v${submission.iteration} for "${d.campaign.title}" is ready.`,
      link: `/campaigns/${d.campaign.id}?tab=deliverables`,
      meta: { campaignId: d.campaign.id, deliverableId, iteration: submission.iteration },
      emailTemplate: 'contentSubmitted',
      emailData: {
        brandName: d.campaign.brand.name,
        influencerName: d.campaign.influencer.displayName,
        campaignTitle: d.campaign.title,
        stage: 'RAW',
      },
    });

    const others = await prisma.user.findMany({
      where: {
        organizationId: d.campaign.brand.organizationId,
        isActive: true,
        id: { not: brandOwnerId },
      },
      select: { id: true },
    });
    for (const u of others) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Influencer uploaded raw content',
        body: `Raw v${submission.iteration} for "${d.campaign.title}".`,
        link: `/campaigns/${d.campaign.id}?tab=deliverables`,
        meta: { campaignId: d.campaign.id, deliverableId },
      });
    }
  }

  return shapeDeliverable({ ...d, status: 'RAW_UPLOADED', submissions: [submission] });
}


// ======================================================
// 2. START EDITING — agency OR influencer (solo flow)
// ======================================================
// ======================================================
// 2. START EDITING — agency OR influencer (solo flow)
// ======================================================
async function startEditing(user, deliverableId) {
  const d = await loadDeliverableAuth(deliverableId);

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAgency = user.roles?.includes('AGENCY') && d.campaign.agencyId === user.organizationId;
  const isInfluencer = d.campaign.influencer?.userId === user.id;

  if (!isAdmin && !isAgency && !isInfluencer) {
    throw httpError('Forbidden: cannot start editing', 403, 'FORBIDDEN');
  }

  if (d.status !== 'RAW_UPLOADED') {
    throw httpError(
      `Can only start editing from RAW_UPLOADED (current: ${d.status})`,
      400, 'INVALID_STATUS'
    );
  }

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'AGENCY_EDITING' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.start_editing',
    targetType: 'CampaignDeliverable',
    targetId: deliverableId,
    meta: { byRole: isAgency ? 'AGENCY' : isInfluencer ? 'INFLUENCER' : 'ADMIN' },
  });

  return shapeDeliverable({ ...d, status: 'AGENCY_EDITING' });
}

// ======================================================
// 3. AGENCY — submit FINAL
// ======================================================
// ======================================================
// 3. SUBMIT FINAL — agency OR influencer OR admin
// ======================================================
async function submitFinalContent(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAgency = user.roles?.includes('AGENCY');
  const isInfluencer = d.campaign.influencer?.userId === user.id;

  if (!isAdmin && !isAgency && !isInfluencer) {
    throw httpError('Forbidden: cannot submit final content', 403, 'FORBIDDEN');
  }

  const { files, caption, notes } = payload;
  if (!Array.isArray(files) || files.length === 0) {
    throw httpError('At least one file is required', 400, 'NO_FILES');
  }

  const allowed = ['RAW_UPLOADED', 'AGENCY_EDITING', 'CHANGES_REQUESTED', 'BRAND_REJECTED'];
  if (!allowed.includes(d.status)) {
    throw httpError(
      `Cannot submit final content in status "${d.status}"`,
      400, 'INVALID_STATUS'
    );
  }

  // Decide submitter role + agency link
  let submitterRole;
  let submitterAgencyId = null;

  if (isAgency && d.campaign.agencyId === user.organizationId) {
    submitterRole = 'AGENCY';
    submitterAgencyId = user.organizationId;
  } else if (isInfluencer) {
    submitterRole = 'INFLUENCER';
  } else if (isAdmin) {
    submitterRole = 'ADMIN';
  } else {
    // AGENCY role but campaign not linked / different org — allow submission
    submitterRole = 'AGENCY';
    submitterAgencyId = user.organizationId || null;
  }

  const submission = await createVersionedSubmission({
    deliverableId,
    files,
    caption: caption ?? null,
    notes: notes ?? null,
    stage: 'FINAL',
    status: 'PENDING',
    submittedBy: user.id,
    submittedByRole: submitterRole,
    submittedByAgencyId: submitterAgencyId,
  });

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'FINAL_UPLOADED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.final.submit',
    targetType: 'ContentSubmission',
    targetId: submission.id,
    meta: {
      deliverableId,
      filesCount: files.length,
      iteration: submission.iteration,
      byRole: submitterRole,
    },
  });

  const brandOwnerId = await findBrandOwnerUserId(d.campaign);
  const brandUsers = await prisma.user.findMany({
    where: { organizationId: d.campaign.brand.organizationId, isActive: true },
    select: { id: true },
  });

  for (const u of brandUsers) {
    const isOwner = u.id === brandOwnerId;
    await notifyUser(u.id, {
      type: 'SYSTEM',
      title: submission.iteration > 1
        ? `Final v${submission.iteration} ready for approval`
        : 'Final content ready for approval',
      body: `"${d.campaign.title}" — ${d.platform} ${d.contentType} needs review.`,
      link: `/campaigns/${d.campaign.id}?tab=deliverables`,
      meta: { campaignId: d.campaign.id, deliverableId, iteration: submission.iteration },
      emailTemplate: isOwner ? 'contentSubmitted' : undefined,
      emailData: isOwner ? {
        brandName: d.campaign.brand.name,
        influencerName: d.campaign.influencer.displayName,
        campaignTitle: d.campaign.title,
        stage: 'FINAL',
      } : undefined,
    });
  }

  await notifyAdmins({
    type: 'SYSTEM',
    title: 'Content submitted for brand approval',
    body: `${d.campaign.title} — awaiting brand decision.`,
    link: `/campaigns/${d.campaign.id}`,
    meta: { campaignId: d.campaign.id, deliverableId },
  });

  return shapeDeliverable({ ...d, status: 'FINAL_UPLOADED', submissions: [submission] });
}

// ======================================================
// 4. BRAND — approve
// ======================================================
async function approveContent(user, deliverableId) {
  const d = await loadDeliverableAuth(deliverableId);
  assertIsBrandSide(user, d.campaign);

  if (d.status !== 'FINAL_UPLOADED' && d.status !== 'BRAND_REVIEW') {
    throw httpError(
      `Can only approve from FINAL_UPLOADED/BRAND_REVIEW (current: ${d.status})`,
      400, 'INVALID_STATUS'
    );
  }

  const latestFinal = d.submissions.find((s) => s.stage === 'FINAL' && s.isLatest);
  if (latestFinal) {
    await prisma.contentSubmission.update({
      where: { id: latestFinal.id },
      data: {
        status: 'APPROVED',
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
  }

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'BRAND_APPROVED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.brand.approve',
    targetType: 'CampaignDeliverable',
    targetId: deliverableId,
  });

  if (d.campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: d.campaign.agencyId, isActive: true },
      select: { id: true },
    });
    for (const u of agencyUsers) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Content approved — ready to publish',
        body: `"${d.campaign.title}" — ${d.platform} ${d.contentType}`,
        link: `/campaigns/${d.campaign.id}?tab=deliverables`,
        meta: { campaignId: d.campaign.id, deliverableId },
      });
    }
  }

  if (d.campaign.influencer.userId) {
    await notifyUser(d.campaign.influencer.userId, {
      type: 'SYSTEM',
      title: 'Your content was approved',
      body: `"${d.campaign.title}" — brand approved the final content.`,
      link: `/campaigns/${d.campaign.id}`,
      meta: { campaignId: d.campaign.id, deliverableId },
      emailTemplate: 'contentApproved',
      emailData: {
        influencerName: d.campaign.influencer.displayName,
        campaignTitle: d.campaign.title,
        amount: Number(d.campaign.total || 0),
        currency: d.campaign.currency || 'PKR',
      },
    });
  }

  return shapeDeliverable({ ...d, status: 'BRAND_APPROVED' });
}

// ======================================================
// 5. BRAND — reject with feedback
// ======================================================
async function rejectContent(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);
  assertIsBrandSide(user, d.campaign);

  if (d.status !== 'FINAL_UPLOADED' && d.status !== 'BRAND_REVIEW') {
    throw httpError(
      `Can only reject from FINAL_UPLOADED/BRAND_REVIEW (current: ${d.status})`,
      400, 'INVALID_STATUS'
    );
  }

  const feedback = (payload.feedback || '').trim();
  if (!feedback) throw httpError('Feedback is required for rejection', 400, 'NO_FEEDBACK');

  const latestFinal = d.submissions.find((s) => s.stage === 'FINAL' && s.isLatest);
  if (latestFinal) {
    await prisma.contentSubmission.update({
      where: { id: latestFinal.id },
      data: {
        status: 'REJECTED',
        feedback,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    });
  }

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'BRAND_REJECTED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.brand.reject',
    targetType: 'CampaignDeliverable',
    targetId: deliverableId,
    meta: { feedback },
  });

  if (d.campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: d.campaign.agencyId, isActive: true },
      select: { id: true },
    });
    for (const u of agencyUsers) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Content needs changes',
        body: feedback,
        link: `/campaigns/${d.campaign.id}?tab=deliverables`,
        meta: { campaignId: d.campaign.id, deliverableId },
      });
    }
  }

  return shapeDeliverable({ ...d, status: 'BRAND_REJECTED' });
}

// ======================================================
// 6. AGENCY — publish
// ======================================================
async function publishContent(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);
  assertIsAgencySide(user, d.campaign);

  if (d.status !== 'BRAND_APPROVED' && d.status !== 'PUBLISHED') {
    throw httpError(
      `Can only publish from BRAND_APPROVED (current: ${d.status})`,
      400, 'INVALID_STATUS'
    );
  }

  const { platform, postUrl, postId, notes } = payload;
  if (!platform) throw httpError('platform is required', 400, 'MISSING_PLATFORM');
  if (!postUrl || String(postUrl).trim().length < 5) {
    throw httpError('postUrl is required', 400, 'MISSING_URL');
  }

  const publish = await prisma.contentPublish.create({
    data: {
      deliverableId,
      platform: String(platform).toUpperCase(),
      postUrl: String(postUrl).trim(),
      postId: postId ?? null,
      postedByUserId: user.id,
      postedByAgencyId: user.organizationId,
      notes: notes ?? null,
    },
  });

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'PUBLISHED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.publish',
    targetType: 'ContentPublish',
    targetId: publish.id,
    meta: { deliverableId, postUrl },
  });

  const brandUsers = await prisma.user.findMany({
    where: { organizationId: d.campaign.brand.organizationId, isActive: true },
    select: { id: true },
  });
  for (const u of brandUsers) {
    await notifyUser(u.id, {
      type: 'SYSTEM',
      title: 'Content published',
      body: `"${d.campaign.title}" — ${d.platform} post is live.`,
      link: `/campaigns/${d.campaign.id}?tab=deliverables`,
      meta: { campaignId: d.campaign.id, deliverableId, postUrl },
    });
  }

  return shapeDeliverable({ ...d, status: 'PUBLISHED' });
}

// ======================================================
// 7. ANY — enter metrics
// ======================================================
async function enterMetrics(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);

  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  const isAgency = user.roles?.includes('AGENCY') && d.campaign.agencyId === user.organizationId;
  const isBrand = user.organizationId && d.campaign.brand.organizationId === user.organizationId;
  const isInfluencer = d.campaign.influencer.userId === user.id;

  if (!isAdmin && !isAgency && !isBrand && !isInfluencer) {
    throw httpError('Forbidden: cannot enter metrics', 403, 'FORBIDDEN');
  }

  if (d.status !== 'PUBLISHED' && d.status !== 'METRICS_ENTERED') {
    throw httpError(
      `Can only enter metrics after PUBLISHED (current: ${d.status})`,
      400, 'INVALID_STATUS'
    );
  }

  const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
  };

  const metric = await prisma.deliverableMetric.create({
    data: {
      deliverableId,
      reach: num(payload.reach),
      impressions: num(payload.impressions),
      likes: num(payload.likes),
      comments: num(payload.comments),
      shares: num(payload.shares),
      clicks: num(payload.clicks),
      conversions: num(payload.conversions),
      revenue: Number(payload.revenue) || 0,
      source: payload.source || 'MANUAL',
      enteredByUserId: user.id,
      enteredByAgencyId: isAgency ? user.organizationId : null,
    },
  });

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'METRICS_ENTERED' },
  });

  await recomputeCampaignAggregates(d.campaign.id);

  await writeAudit({
    actorId: user.id,
    action: 'content.metrics.enter',
    targetType: 'DeliverableMetric',
    targetId: metric.id,
    meta: { deliverableId },
  });

  return shapeDeliverable({ ...d, status: 'METRICS_ENTERED' });
}

async function recomputeCampaignAggregates(campaignId) {
  const agg = await prisma.deliverableMetric.aggregate({
    where: { deliverable: { campaignId } },
    _sum: {
      reach: true, impressions: true, clicks: true,
      conversions: true, revenue: true,
    },
  });

  await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      reach: agg._sum.reach ?? 0,
      impressions: agg._sum.impressions ?? 0,
      clicks: agg._sum.clicks ?? 0,
      conversions: agg._sum.conversions ?? 0,
      revenue: agg._sum.revenue ?? 0,
    },
  });
}

// ======================================================
// 8. INFLUENCER — Forward agency content as FINAL
// Brand ko sirf dikhega ke influencer ne submit kiya
// ======================================================
async function submitFinalAsInfluencer(user, deliverableId, payload = {}) {
  const d = await loadDeliverableAuth(deliverableId);
  assertIsInfluencerSide(user, d.campaign);

  const { files, caption, notes, engagementId } = payload;
  if (!Array.isArray(files) || files.length === 0) {
    throw httpError('At least one file is required', 400, 'NO_FILES');
  }

  const allowed = ['PENDING', 'IN_PROGRESS', 'RAW_UPLOADED', 'CHANGES_REQUESTED', 'BRAND_REJECTED'];
  if (!allowed.includes(d.status)) {
    throw httpError(
      `Cannot submit final content in status "${d.status}"`,
      400, 'INVALID_STATUS'
    );
  }

  // ✅ Submit FINAL as INFLUENCER (agency hidden)
  const submission = await createVersionedSubmission({
    deliverableId,
    files,
    caption: caption ?? null,
    notes: notes ?? null,
    stage: 'FINAL',
    status: 'PENDING',
    submittedBy: user.id,
    submittedByRole: 'INFLUENCER',
    submittedByAgencyId: null,
  });

  await prisma.campaignDeliverable.update({
    where: { id: deliverableId },
    data: { status: 'FINAL_UPLOADED' },
  });

  await writeAudit({
    actorId: user.id,
    action: 'content.final.submit_influencer',
    targetType: 'ContentSubmission',
    targetId: submission.id,
    meta: { deliverableId, filesCount: files.length, engagementId: engagementId || null },
  });

  // ✅ Real-time: notify offer update
  await safeEmitOffer(d.campaign.offerId, 'updated');

  // Notify brand (in-app + email)
  const brandOwnerId = await findBrandOwnerUserId(d.campaign);
  const brandUsers = await prisma.user.findMany({
    where: { organizationId: d.campaign.brand.organizationId, isActive: true },
    select: { id: true },
  });

  for (const u of brandUsers) {
    const isOwner = u.id === brandOwnerId;
    await notifyUser(u.id, {
      type: 'SYSTEM',
      title: submission.iteration > 1
        ? `Final v${submission.iteration} ready for approval`
        : 'Final content ready for approval',
      body: `"${d.campaign.title}" — ${d.platform} ${d.contentType} needs review.`,
      link: `/campaigns/${d.campaign.id}?tab=deliverables`,
      meta: { campaignId: d.campaign.id, deliverableId, iteration: submission.iteration },
      emailTemplate: isOwner ? 'contentSubmitted' : undefined,
      emailData: isOwner ? {
        brandName: d.campaign.brand.name,
        influencerName: d.campaign.influencer.displayName,
        campaignTitle: d.campaign.title,
        stage: 'FINAL',
      } : undefined,
    });
  }

  return shapeDeliverable({ ...d, status: 'FINAL_UPLOADED', submissions: [submission] });
}

module.exports = {
  submitRawContent,
  startEditing,
  submitFinalContent,
  approveContent,
  rejectContent,
  publishContent,
  submitFinalAsInfluencer,
  enterMetrics,
  recomputeCampaignAggregates,
};