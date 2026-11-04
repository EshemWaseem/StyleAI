// services/agency/campaign.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v20.0').trim();
const GRAPH_BASE_URL = (process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com').trim();

async function getActiveIntegrations(user) {
  const clientLinks = await prisma.agencyClient.findMany({
    where: { agencyOrganizationId: user.organizationId, status: 'ACTIVE' },
    select: { clientOrganizationId: true }
  });
  
  const orgIds = [user.organizationId, ...clientLinks.map(c => c.clientOrganizationId)];
  
  return prisma.agencyAdAccount.findMany({
    where: {
      agencyOrganizationId: { in: orgIds },
      provider: 'META'
    },
  });
}

async function createMetaCampaign(user, payload) {
  const { name, budget, link, imageUrl, adText, headline, platforms, targetOrganizationId } = payload;

  if (!name || !budget || !link || !imageUrl || !adText) {
    throw httpError('Missing required fields', 400, 'MISSING_FIELDS');
  }

  let adAccountOrgId = user.organizationId;

  if (targetOrganizationId && targetOrganizationId !== user.organizationId) {
    const clientRelationship = await prisma.agencyClient.findUnique({
      where: {
        agencyOrganizationId_clientOrganizationId: {
          agencyOrganizationId: user.organizationId,
          clientOrganizationId: targetOrganizationId,
        }
      }
    });

    if (!clientRelationship) {
      throw httpError('You do not have permission to manage campaigns for this client.', 403, 'FORBIDDEN');
    }
    
    adAccountOrgId = targetOrganizationId;
  }

  let integration = await prisma.agencyAdAccount.findUnique({
    where: {
      agencyOrganizationId_provider: {
        agencyOrganizationId: adAccountOrgId,
        provider: 'META',
      },
    },
  });

  // FALLBACK: System User Token
  if (!integration || !integration.accessToken || !integration.accountId) {
    const sysToken = process.env.META_SYSTEM_USER_TOKEN;
    const sysAccountId = process.env.META_AD_ACCOUNT_ID;
    
    if (sysToken && sysAccountId) {
      console.warn('[Meta] Using System User Token fallback');
      integration = { accessToken: sysToken, accountId: sysAccountId };
    } else {
      const msg = targetOrganizationId 
        ? 'The selected client has not connected their Meta account.'
        : 'Your agency Meta account is not connected.';
      throw httpError(msg, 400, 'META_NOT_CONNECTED');
    }
  }

  const { accessToken, accountId } = integration;
  const formattedAccountId = accountId.startsWith('act_') ? accountId : `act_${accountId}`;

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

  const pagesData = await callMetaAPI(`me/accounts?access_token=${accessToken}`, 'GET');
  const pageId = pagesData.data?.[0]?.id;
  if (!pageId) {
    throw httpError('No Facebook Page found. You need a Facebook Page to run ads.', 400, 'NO_FB_PAGE');
  }

  let instagramActorId = null;
  try {
    const igData = await callMetaAPI(`${pageId}?fields=instagram_business_account&access_token=${accessToken}`, 'GET');
    if (igData.instagram_business_account) {
      instagramActorId = igData.instagram_business_account.id;
    }
  } catch (err) {
    console.warn("Could not fetch Instagram business account.");
  }

  const chosenPlatforms = platforms || { 
    facebook: true, instagram: true, 
    fbFeed: true, fbStory: true, fbReels: true, 
    igFeed: true, igStory: true, igReels: true, igExplore: true 
  };

  const publisher_platforms = [];
  const facebook_positions = [];
  const instagram_positions = [];

  if (chosenPlatforms.facebook) {
    publisher_platforms.push('facebook');
    if (chosenPlatforms.fbFeed) facebook_positions.push('feed');
    if (chosenPlatforms.fbStory) facebook_positions.push('story');
    if (chosenPlatforms.fbReels) facebook_positions.push('facebook_reels');
  }

  if (chosenPlatforms.instagram && instagramActorId) {
    publisher_platforms.push('instagram');
    if (chosenPlatforms.igFeed) instagram_positions.push('stream');
    if (chosenPlatforms.igStory) instagram_positions.push('story');
    if (chosenPlatforms.igReels) instagram_positions.push('reels');
    if (chosenPlatforms.igExplore) instagram_positions.push('explore');
  }

  const targeting = {
    geo_locations: { countries: ['US', 'PK'] },
    age_min: 18,
    age_max: 65,
    publisher_platforms,
  };

  if (facebook_positions.length > 0) targeting.facebook_positions = facebook_positions;
  if (instagram_positions.length > 0) targeting.instagram_positions = instagram_positions;

  const campaignData = await callMetaAPI(`${formattedAccountId}/campaigns`, 'POST', {
    name,
    objective: 'OUTCOME_TRAFFIC',
    status: 'PAUSED',
    special_ad_categories: 'NONE',
    access_token: accessToken,
  });
  const campaignId = campaignData.id;

  const adSetData = await callMetaAPI(`${formattedAccountId}/adsets`, 'POST', {
    name: `${name} - AdSet`,
    campaign_id: campaignId,
    daily_budget: parseInt(budget) * 100,
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'LINK_CLICKS',
    targeting: targeting,
    status: 'PAUSED',
    access_token: accessToken,
  });
  const adSetId = adSetData.id;

  const object_story_spec = {
    page_id: pageId,
    link_data: {
      message: adText,
      link: link,
      image_url: imageUrl,
      name: headline || 'Check this out!',
      call_to_action: { type: 'LEARN_MORE' },
    },
  };

  if (instagramActorId) {
    object_story_spec.instagram_actor_id = instagramActorId;
  }

  const creativeData = await callMetaAPI(`${formattedAccountId}/adcreatives`, 'POST', {
    name: `${name} - Creative`,
    object_story_spec: object_story_spec,
    access_token: accessToken,
  });
  const creativeId = creativeData.id;

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
  const integrations = await getActiveIntegrations(user);
  if (integrations.length === 0) return { campaigns: [] };

  let allCampaigns = [];
  
  for (const integration of integrations) {
    if (!integration.accessToken || !integration.accountId) continue;
    
    const formattedAccountId = integration.accountId.startsWith('act_') 
      ? integration.accountId 
      : `act_${integration.accountId}`;

    const url = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/${formattedAccountId}/campaigns`);
    url.searchParams.set('fields', 'id,name,status,objective,daily_budget,created_time');
    url.searchParams.set('access_token', integration.accessToken);

    try {
      const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
      const data = await res.json();
      
      if (res.ok && data.data) {
        const mapped = data.data.map((c) => ({
          id: c.id,
          name: c.name,
          status: c.status,
          objective: c.objective,
          budget: c.daily_budget ? (parseInt(c.daily_budget) / 100).toFixed(2) : null,
          createdAt: c.created_time,
          sourceOrgId: integration.agencyOrganizationId
        }));
        allCampaigns = [...allCampaigns, ...mapped];
      }
    } catch (err) {
      console.error(`Failed to fetch campaigns for account ${formattedAccountId}`, err);
    }
  }

  allCampaigns.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return { campaigns: allCampaigns };
}

async function toggleCampaignStatus(user, campaignId, newStatus) {
  const integrations = await getActiveIntegrations(user);
  if (integrations.length === 0) throw httpError('Meta not connected', 400, 'NOT_CONNECTED');

  for (const integration of integrations) {
    const url = `${GRAPH_BASE_URL}/${GRAPH_VERSION}/${campaignId}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept-Encoding': 'identity' },
      body: JSON.stringify({ status: newStatus, access_token: integration.accessToken }),
    });

    const data = await res.json();
    if (res.ok && !data.error) {
      return { success: true };
    }
  }
  
  throw httpError('Failed to update status. Campaign not found in connected accounts.', 400, 'META_UPDATE_ERROR');
}

async function getMetaCampaignInsights(user, campaignId) {
  const integrations = await getActiveIntegrations(user);
  if (integrations.length === 0) throw httpError('Meta not connected', 400, 'NOT_CONNECTED');

  for (const integration of integrations) {
    const url = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/${campaignId}/insights`);
    url.searchParams.set('fields', 'spend,impressions,clicks,reach,actions');
    url.searchParams.set('date_preset', 'maximum');
    url.searchParams.set('access_token', integration.accessToken);

    try {
      const res = await fetch(url.toString(), { headers: { 'Accept-Encoding': 'identity' } });
      const data = await res.json();

      if (res.ok && !data.error) {
        const insight = data.data && data.data.length > 0 ? data.data[0] : {};
        return {
          spend: parseFloat(insight.spend || 0),
          impressions: parseInt(insight.impressions || 0),
          clicks: parseInt(insight.clicks || 0),
          reach: parseInt(insight.reach || 0),
        };
      }
    } catch (err) {
      // Ignore and try next integration
    }
  }
  
  throw httpError('Failed to fetch insights. Campaign not found in connected accounts.', 400, 'META_INSIGHTS_ERROR');
}

module.exports = {
  createMetaCampaign,
  listMetaCampaigns,
  toggleCampaignStatus,
  getMetaCampaignInsights
};