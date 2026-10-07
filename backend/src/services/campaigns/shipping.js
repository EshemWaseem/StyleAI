// services/campaigns/shipping.js
// ======================================================
// Shipping flow:
//   influencer submits address → brand ships → influencer receives
//   + content deadline set by brand
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { writeAudit } = require('../admin/helpers');
const { notifyUser } = require('../notifications');
const {
  assertIsBrandSide,
  assertIsInfluencerSide,
  shapeCampaign,
} = require('./helpers');

// ------------------------------------------------------
// Address validation (Option A — structured)
// ------------------------------------------------------
function validateAddress(raw = {}) {
  const required = ['fullName', 'phone', 'street', 'city', 'country'];
  const missing = required.filter((k) => !raw[k] || !String(raw[k]).trim());
  if (missing.length > 0) {
    throw httpError(
      `Missing shipping fields: ${missing.join(', ')}`,
      400,
      'INVALID_ADDRESS'
    );
  }

  return {
    fullName:   String(raw.fullName).trim(),
    phone:      String(raw.phone).trim(),
    street:     String(raw.street).trim(),
    city:       String(raw.city).trim(),
    state:      raw.state ? String(raw.state).trim() : null,
    postalCode: raw.postalCode ? String(raw.postalCode).trim() : null,
    country:    String(raw.country).trim(),
    notes:      raw.notes ? String(raw.notes).trim() : null,
  };
}

// ======================================================
// 1. INFLUENCER submits shipping address
// ======================================================
async function submitShippingAddress(user, campaignId, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsInfluencerSide(user, campaign);

  if (campaign.status !== 'AWAITING_ADDRESS') {
    throw httpError(
      `Cannot submit address in status "${campaign.status}"`,
      400,
      'INVALID_STATUS'
    );
  }

  const address = validateAddress(payload.address || payload);

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      shippingAddress: address,
      status: 'ADDRESS_SUBMITTED',
    },
    include: { brand: true, influencer: true, agency: true, deliverables: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'campaign.address.submit',
    targetType: 'Campaign',
    targetId: campaignId,
    meta: { city: address.city, country: address.country },
  });

  // Notify brand owner + agency
  const brandOwner = await prisma.user.findFirst({
    where: {
      organizationId: campaign.brand.organizationId,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
  if (brandOwner?.id) {
    await notifyUser(brandOwner.id, {
      type: 'SYSTEM',
      title: 'Shipping address submitted',
      body: `${campaign.influencer.displayName} submitted their shipping address for "${campaign.title}".`,
      link: `/campaigns/${campaignId}`,
      meta: { campaignId },
    }).catch(() => {});
  }
  if (campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: campaign.agencyId, isActive: true },
      select: { id: true },
    });
    for (const u of agencyUsers) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Address ready — awaiting shipment',
        body: `"${campaign.title}" — brand needs to ship the product.`,
        link: `/campaigns/${campaignId}`,
        meta: { campaignId },
      }).catch(() => {});
    }
  }

  return shapeCampaign(updated);
}

// ======================================================
// 2. BRAND marks as SHIPPED
// ======================================================
async function markShipped(user, campaignId, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsBrandSide(user, campaign);

  if (campaign.status !== 'ADDRESS_SUBMITTED') {
    throw httpError(
      `Cannot ship in status "${campaign.status}"`,
      400,
      'INVALID_STATUS'
    );
  }

  const { carrier, trackingNumber, note } = payload;
  if (!carrier || !String(carrier).trim()) {
    throw httpError('carrier is required', 400, 'MISSING_CARRIER');
  }
  if (!trackingNumber || !String(trackingNumber).trim()) {
    throw httpError('trackingNumber is required', 400, 'MISSING_TRACKING');
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      shippingCarrier: String(carrier).trim(),
      trackingNumber:  String(trackingNumber).trim(),
      shippedAt:       new Date(),
      status:          'SHIPPED',
    },
    include: { brand: true, influencer: true, agency: true, deliverables: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'campaign.ship',
    targetType: 'Campaign',
    targetId: campaignId,
    meta: { carrier, trackingNumber },
  });

  // Notify influencer
  if (campaign.influencer.userId) {
    await notifyUser(campaign.influencer.userId, {
      type: 'SYSTEM',
      title: 'Product shipped!',
      body: `"${campaign.title}" — ${carrier} (${trackingNumber})`,
      link: `/campaigns/${campaignId}`,
      meta: { campaignId, carrier, trackingNumber, note: note || null },
    }).catch(() => {});
  }

  return shapeCampaign(updated);
}

// ======================================================
// 3. INFLUENCER marks as RECEIVED
// ======================================================
async function markReceived(user, campaignId, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsInfluencerSide(user, campaign);

  if (campaign.status !== 'SHIPPED') {
    throw httpError(
      `Cannot mark received in status "${campaign.status}"`,
      400,
      'INVALID_STATUS'
    );
  }

  const now = new Date();

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      receivedAt: now,
      status:     'IN_PRODUCTION',
    },
    include: { brand: true, influencer: true, agency: true, deliverables: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'campaign.receive',
    targetType: 'Campaign',
    targetId: campaignId,
    meta: { receivedAt: now.toISOString(), note: payload.note || null },
  });

  // Notify brand owner + agency
  const brandOwner = await prisma.user.findFirst({
    where: {
      organizationId: campaign.brand.organizationId,
      userRoles: { some: { role: { name: 'BRAND_OWNER' } } },
    },
    select: { id: true },
  });
  if (brandOwner?.id) {
    await notifyUser(brandOwner.id, {
      type: 'SYSTEM',
      title: 'Product received 🎉',
      body: `${campaign.influencer.displayName} received the product. Content production has started.`,
      link: `/campaigns/${campaignId}`,
      meta: { campaignId },
    }).catch(() => {});
  }
  if (campaign.agencyId) {
    const agencyUsers = await prisma.user.findMany({
      where: { organizationId: campaign.agencyId, isActive: true },
      select: { id: true },
    });
    for (const u of agencyUsers) {
      await notifyUser(u.id, {
        type: 'SYSTEM',
        title: 'Ready for production',
        body: `"${campaign.title}" — influencer received the product.`,
        link: `/campaigns/${campaignId}`,
        meta: { campaignId },
      }).catch(() => {});
    }
  }

  return shapeCampaign(updated);
}

// ======================================================
// 4. BRAND sets content deadline
// ======================================================
async function setContentDeadline(user, campaignId, payload = {}) {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    include: { brand: true, influencer: true, agency: true },
  });
  if (!campaign) throw httpError('Campaign not found', 404, 'NOT_FOUND');

  assertIsBrandSide(user, campaign);

  const { contentDeadline } = payload;
  if (!contentDeadline) {
    throw httpError('contentDeadline is required', 400, 'MISSING_DEADLINE');
  }

  const deadline = new Date(contentDeadline);
  if (isNaN(deadline.getTime())) {
    throw httpError('Invalid contentDeadline date', 400, 'INVALID_DATE');
  }
  if (deadline <= new Date()) {
    throw httpError('Deadline must be in the future', 400, 'PAST_DEADLINE');
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: { contentDeadline: deadline },
    include: { brand: true, influencer: true, agency: true, deliverables: true },
  });

  await writeAudit({
    actorId: user.id,
    action: 'campaign.deadline.set',
    targetType: 'Campaign',
    targetId: campaignId,
    meta: { contentDeadline: deadline.toISOString() },
  });

  if (campaign.influencer.userId) {
    await notifyUser(campaign.influencer.userId, {
      type: 'SYSTEM',
      title: 'Content deadline set',
      body: `"${campaign.title}" — deliver by ${deadline.toLocaleDateString()}.`,
      link: `/campaigns/${campaignId}`,
      meta: { campaignId, contentDeadline: deadline.toISOString() },
    }).catch(() => {});
  }

  return shapeCampaign(updated);
}

module.exports = {
  submitShippingAddress,
  markShipped,
  markReceived,
  setContentDeadline,
};