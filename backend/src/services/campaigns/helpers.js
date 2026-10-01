// services/campaigns/helpers.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

// ------------------------------------------------------
// Auth: is user allowed to see this campaign?
// ------------------------------------------------------
async function assertCanViewCampaign(user, campaign) {
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (isAdmin) return;

  const isBrandSide =
    user.organizationId && campaign.brand?.organizationId === user.organizationId;
  const isInfluencerSide = campaign.influencer?.userId === user.id;
  const isAgencySide =
    user.roles?.includes('AGENCY') &&
    campaign.agencyId &&
    user.organizationId === campaign.agencyId;

  if (!isBrandSide && !isInfluencerSide && !isAgencySide) {
    throw httpError('Forbidden: you do not have access to this campaign', 403, 'FORBIDDEN');
  }
}

function assertIsBrandSide(user, campaign) {
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (isAdmin) return;
  if (!user.organizationId || campaign.brand?.organizationId !== user.organizationId) {
    throw httpError('Forbidden: brand access required', 403, 'NOT_BRAND');
  }
}

function assertIsInfluencerSide(user, campaign) {
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (isAdmin) return;
  if (campaign.influencer?.userId !== user.id) {
    throw httpError('Forbidden: influencer access required', 403, 'NOT_INFLUENCER');
  }
}

function assertIsAgencySide(user, campaign) {
  const isAdmin = user.roles?.includes('SUPER_ADMIN');
  if (isAdmin) return;
  if (!user.roles?.includes('AGENCY') || campaign.agencyId !== user.organizationId) {
    throw httpError('Forbidden: agency access required', 403, 'NOT_AGENCY');
  }
}

// ------------------------------------------------------
// Shaping
// ------------------------------------------------------
function shapeSubmission(s) {
  return {
    id: s.id,
    deliverableId: s.deliverableId,
    files: s.files,
    caption: s.caption,
    notes: s.notes,
    stage: s.stage,
    status: s.status,
    submittedByRole: s.submittedByRole,
    submittedByAgencyId: s.submittedByAgencyId,
    feedback: s.feedback,
    reviewedBy: s.reviewedBy,
    reviewedAt: s.reviewedAt,
    submittedBy: s.submittedBy,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}

function shapePublish(p) {
  return {
    id: p.id,
    platform: p.platform,
    postUrl: p.postUrl,
    postId: p.postId,
    postedAt: p.postedAt,
    postedByUserId: p.postedByUserId,
    postedByAgencyId: p.postedByAgencyId,
    notes: p.notes,
    createdAt: p.createdAt,
  };
}

function shapeMetric(m) {
  return {
    id: m.id,
    reach: m.reach,
    impressions: m.impressions,
    likes: m.likes,
    comments: m.comments,
    shares: m.shares,
    clicks: m.clicks,
    conversions: m.conversions,
    revenue: Number(m.revenue),
    source: m.source,
    enteredByUserId: m.enteredByUserId,
    enteredByAgencyId: m.enteredByAgencyId,
    createdAt: m.createdAt,
  };
}

function shapeDeliverable(d, { withSubmissions = false } = {}) {
  const out = {
    id: d.id,
    campaignId: d.campaignId,
    platform: d.platform,
    contentType: d.contentType,
    quantity: d.quantity,
    status: d.status,
    dueDate: d.dueDate,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
  if (withSubmissions && Array.isArray(d.submissions)) {
    out.submissions = d.submissions.map(shapeSubmission);
  }
  if (Array.isArray(d.publishes)) {
    out.publishes = d.publishes.map(shapePublish);
  }
  if (Array.isArray(d.metrics)) {
    out.metrics = d.metrics.map(shapeMetric);
  }
  return out;
}

function shapeMessage(m) {
  return {
    id: m.id,
    campaignId: m.campaignId,
    senderUserId: m.senderUserId,
    senderRole: m.senderRole,
    body: m.body,
    attachments: m.attachments,
    createdAt: m.createdAt,
  };
}

function shapeCampaign(c, { withRelations = true } = {}) {
  const out = {
    id: c.id,
    offerId: c.offerId,
    brandId: c.brandId,
    influencerId: c.influencerId,
    productId: c.productId,
    agencyId: c.agencyId,
    title: c.title,
    description: c.description,
    currency: c.currency,
    totalAmount: Number(c.totalAmount),
    brief: c.brief,
    hashtags: c.hashtags || [],
    mentions: c.mentions || [],
    startDate: c.startDate,
    dueDate: c.dueDate,
    completedAt: c.completedAt,
    status: c.status,
    reach: c.reach,
    impressions: c.impressions,
    clicks: c.clicks,
    conversions: c.conversions,
    revenue: Number(c.revenue || 0),
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
  };

  if (withRelations) {
    out.brand = c.brand
      ? { id: c.brand.id, name: c.brand.name, slug: c.brand.slug, logoUrl: c.brand.logoUrl }
      : undefined;

    out.influencer = c.influencer
      ? {
          id: c.influencer.id,
          displayName: c.influencer.displayName,
          username: c.influencer.username,
          slug: c.influencer.slug,
          avatarUrl: c.influencer.avatarUrl,
        }
      : undefined;

    out.product = c.product
      ? {
          id: c.product.id,
          name: c.product.name,
          sku: c.product.sku,
          category: c.product.category,
          price: c.product.price != null ? Number(c.product.price) : null,
          currency: c.product.currency,
          primaryImage: c.product.images?.[0]?.url ?? null,
        }
      : undefined;

    out.agency = c.agency
      ? { id: c.agency.id, name: c.agency.name, slug: c.agency.slug }
      : undefined;

    if (Array.isArray(c.deliverables)) {
      out.deliverables = c.deliverables.map((d) =>
        shapeDeliverable(d, { withSubmissions: Array.isArray(d.submissions) })
      );
    }
    if (Array.isArray(c.messages)) {
      out.messages = c.messages.map(shapeMessage);
    }
  }

  return out;
}

module.exports = {
  assertCanViewCampaign,
  assertIsBrandSide,
  assertIsInfluencerSide,
  assertIsAgencySide,
  shapeCampaign,
  shapeDeliverable,
  shapeSubmission,
  shapePublish,
  shapeMetric,
  shapeMessage,
};