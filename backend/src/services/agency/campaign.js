// services/agency/campaign.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v20.0').trim();
const GRAPH_BASE_URL = (process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com').trim();

async function createMetaCampaign(user, payload) {
  const { name, budget, link, imageUrl, adText, headline } = payload;

  if (!name || !budget || !link || !imageUrl || !adText) {
    throw httpError('Missing required fields', 400, 'MISSING_FIELDS');
  }

  const integration = await prisma.agencyAdAccount.findUnique({
    where: {
      agencyOrganizationId_provider: {
        agencyOrganizationId: user.organizationId,
        provider: 'META',
      },
    },
  });

  if (!integration || !integration.accessToken || !integration.accountId) {
    throw httpError('Meta account not connected properly', 400, 'META_NOT_CONNECTED');
  }

  const { accessToken, accountId } = integration;
  const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

  // Helper for Meta API calls
  const callMetaAPI = async (endpoint, method, body) => {
    const url = `${GRAPH_BASE_URL}/${GRAPH_VERSION}/${endpoint}`;
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error(`[Meta API Error] ${endpoint}:`, data.error);
      throw httpError(data.error?.message || 'Meta API Error', 400, 'META_API_ERROR');
    }
    return data;
  };

  // Fetch the first Facebook Page (Ads require a Page)
  const pagesData = await callMetaAPI(`me/accounts?access_token=${accessToken}`, 'GET');
  const pageId = pagesData.data?.[0]?.id;
  if (!pageId) {
    throw httpError('No Facebook Page found. You need a Facebook Page to run ads.', 400, 'NO_FB_PAGE');
  }

  // 1. Create Campaign (PAUSED for safety)
  const campaignData = await callMetaAPI(`${formattedAccountId}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: 'NONE',
    access_token: accessToken,
  });
  const campaignId = campaignData.id;

  // 2. Create Ad Set (PAUSED)
  const adSetData = await callMetaAPI(`${formattedAccountId}/adsets`, 'POST', {
    name: `${name} - AdSet`,
    campaign_id: campaignId,
    daily_budget: parseInt(budget) * 100, // Meta expects cents
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
        targeting: {
      geo_locations: { countries: ['US', 'PK'] },
      age_min: 18,
      age_max: 65,
      // 🔥 Instagram & Facebook dono par ad chalegi
      publisher_platforms: ['facebook', 'instagram'],
      facebook_positions: ['feed'],
      instagram_positions: ['stream', 'story'],
    },
    status: 'PAUSED',
    access_token: accessToken,
  });
  const adSetId = adSetData.id;

  // 3. Create Ad Creative
  const creativeData = await callMetaAPI(`${formattedAccountId}/adcreatives`, 'POST', {
    name: `${name} - Creative`,
    object_story_spec: {
      page_id: pageId,
      link_data: {
        message: adText,
        link: link,
        image_url: imageUrl,
        name: headline || 'Check this out!',
        call_to_action: { type: 'LEARN_MORE' },
      },
    },
    access_token: accessToken,
  });
  const creativeId = creativeData.id;

  // 4. Create Ad (PAUSED)
  const adData = await callMetaAPI(`${formattedAccountId}/ads`, 'POST', {
    name: `${name} - Ad`,
    adset_id: adSetId,
    creative: { creative_id: creativeId },
    status: 'PAUSED',
    access_token: accessToken,
  });

  return {
    campaignId,
    adSetId,
    creativeId,
    adId: adData.id,
    message: 'Campaign created successfully in PAUSED state.',
  };
}


async function listMetaCampaigns(user) {
  const integration = await prisma.agencyAdAccount.findUnique({
    where: {
      agencyOrganizationId_provider: {
        agencyOrganizationId: user.organizationId,
        provider: 'META',
      },
    },
  });

  if (!integration || !integration.accessToken || !integration.accountId) {
    return { campaigns: [] }; // Return empty if not connected
  }

  const { accessToken, accountId } = integration;
  const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

  const url = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/${formattedAccountId}/campaigns`);
  url.searchParams.set('fields', 'id,name,status,objective,daily_budget,created_time');
  url.searchParams.set('access_token', accessToken);

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Encoding': 'identity' },
  });
  
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) {
    console.error('[Meta list campaigns error]', data.error);
    throw httpError(data.error?.message || 'Failed to fetch campaigns', 400, 'META_FETCH_ERROR');
  }

  // Meta returns budget in cents, convert to standard currency
  const campaigns = (data.data || []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status, // ACTIVE, PAUSED
    objective: c.objective,
    budget: c.daily_budget ? (parseInt(c.daily_budget) / 100).toFixed(2) : null,
    createdAt: c.created_time,
  }));

  return { campaigns };
}

async function toggleCampaignStatus(user, campaignId, newStatus) {
  const integration = await prisma.agencyAdAccount.findUnique({
    where: { agencyOrganizationId_provider: { agencyOrganizationId: user.organizationId, provider: 'META' } },
  });

  if (!integration) throw httpError('Meta not connected', 400, 'NOT_CONNECTED');

  const url = `${GRAPH_BASE_URL}/${GRAPH_VERSION}/${campaignId}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
    body: JSON.stringify({ status: newStatus, access_token: integration.accessToken }),
  });

  const data = await res.json();
  if (!res.ok || data.error) {
    throw httpError(data.error?.message || 'Failed to update status', 400, 'META_UPDATE_ERROR');
  }
  return { success: true };
}


async function getMetaCampaignInsights(user, campaignId) {
  const integration = await prisma.agencyAdAccount.findUnique({
    where: { agencyOrganizationId_provider: { agencyOrganizationId: user.organizationId, provider: 'META' } },
  });

  if (!integration || !integration.accessToken) {
    throw httpError('Meta not connected', 400, 'NOT_CONNECTED');
  }

  const url = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/${campaignId}/insights`);
  url.searchParams.set('fields', 'spend,impressions,clicks,reach,actions');
  url.searchParams.set('date_preset', 'maximum');
  url.searchParams.set('access_token', integration.accessToken);

  const res = await fetch(url.toString(), {
    headers: { 'Accept-Encoding': 'identity' },
  });
  
  const data = await res.json().catch(() => ({}));
  
  if (!res.ok || data.error) {
    console.error('[Meta Insights Error]', data.error);
    throw httpError(data.error?.message || 'Failed to fetch insights', 400, 'META_INSIGHTS_ERROR');
  }

  const insight = data.data && data.data.length > 0 ? data.data[0] : {};

  return {
    spend: parseFloat(insight.spend || 0),
    impressions: parseInt(insight.impressions || 0),
    clicks: parseInt(insight.clicks || 0),
    reach: parseInt(insight.reach || 0),
  };
}


module.exports = {
  createMetaCampaign,
  listMetaCampaigns,      
  toggleCampaignStatus,
  getMetaCampaignInsights   
};
