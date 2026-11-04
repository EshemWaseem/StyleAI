// services/agency/googleCampaign.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

const GOOGLE_ADS_BASE_URL = (process.env.GOOGLE_ADS_BASE_URL || 'https://googleads.googleapis.com').trim();
const GOOGLE_ADS_VERSION = (process.env.GOOGLE_ADS_API_VERSION || 'v17').trim();

async function createGoogleCampaign(user, payload) {
  const { 
    name, budget, finalUrl, headlines, descriptions, keywords 
  } = payload;

  if (!name || !budget || !finalUrl || !headlines?.length || !descriptions?.length || !keywords?.length) {
    throw httpError('Missing required fields for Google Ads', 400, 'MISSING_FIELDS');
  }

  const integration = await prisma.agencyAdAccount.findUnique({
    where: {
      agencyOrganizationId_provider: {
        agencyOrganizationId: user.organizationId,
        provider: 'GOOGLE',
      },
    },
  });

  if (!integration || !integration.accessToken || !integration.accountId) {
    throw httpError('Google account not connected properly', 400, 'GOOGLE_NOT_CONNECTED');
  }

  const { accessToken, accountId } = integration;
  const customerId = accountId.replace(/-/g, '');

  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || 'dummy_token').trim(),
    'Content-Type': 'application/json',
  };

  if (process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) {
    headers['login-customer-id'] = process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, '');
  }

  const baseUrl = `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_VERSION}/customers/${customerId}`;

  const apiCall = async (endpoint, body) => {
    const res = await fetch(`${baseUrl}/${endpoint}:mutate`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.error) {
      console.error(`Google API Error [${endpoint}]:`, JSON.stringify(data, null, 2));
      throw httpError(data.error?.details?.[0]?.errors?.[0]?.message || `Google ${endpoint} Error`, 400, 'GOOGLE_API_ERROR');
    }
    return data;
  };

  // 1. Create Campaign Budget (Micros)
  const budgetData = await apiCall('campaignBudgets', {
    operations: [{
      create: {
        name: `${name} Budget - ${Date.now()}`,
        amountMicros: parseInt(budget) * 1000000, 
        deliveryMethod: 'STANDARD',
      }
    }]
  });
  const budgetResourceName = budgetData.results[0].resourceName;

  // 2. Create Campaign (PAUSED)
  const campaignData = await apiCall('campaigns', {
    operations: [{
      create: {
        name,
        status: 'PAUSED',
        advertisingChannelType: 'SEARCH',
        manualCpc: {},
        campaignBudget: budgetResourceName,
        networkSettings: {
          targetGoogleSearch: true,
          targetSearchNetwork: true,
        }
      }
    }]
  });
  const campaignResourceName = campaignData.results[0].resourceName;

  // 3. Create Ad Group (PAUSED)
  const adGroupData = await apiCall('adGroups', {
    operations: [{
      create: {
        name: `${name} - Ad Group`,
        campaign: campaignResourceName,
        status: 'PAUSED',
        type: 'SEARCH_STANDARD',
        cpcBidMicros: 1000000, 
      }
    }]
  });
  const adGroupResourceName = adGroupData.results[0].resourceName;

  // 4. Create Keywords
  const keywordOps = keywords.map((kw) => ({
    create: {
      adGroup: adGroupResourceName,
      status: 'ENABLED',
      keyword: { text: kw, matchType: 'BROAD' }
    }
  }));
  await apiCall('adGroupCriteria', { operations: keywordOps });

  // 5. Create Responsive Search Ad (RSA)
  const adGroupAdData = await apiCall('adGroupAds', {
    operations: [{
      create: {
        adGroup: adGroupResourceName,
        status: 'PAUSED',
        ad: {
          finalUrls: [finalUrl],
          responsiveSearchAd: {
            headlines: headlines.map(h => ({ text: h })),
            descriptions: descriptions.map(d => ({ text: d }))
          }
        }
      }
    }]
  });

  return {
    campaignResourceName,
    adGroupResourceName,
    adResourceName: adGroupAdData.results[0].resourceName,
    message: 'Google Search Campaign created successfully in PAUSED state.',
  };
}

module.exports = { createGoogleCampaign };