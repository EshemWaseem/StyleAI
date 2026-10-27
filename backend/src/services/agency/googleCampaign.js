// services/agency/googleCampaign.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');

const GOOGLE_ADS_BASE_URL = (process.env.GOOGLE_ADS_BASE_URL || 'https://googleads.googleapis.com').trim();
const GOOGLE_ADS_VERSION = (process.env.GOOGLE_ADS_API_VERSION || 'v17').trim();

async function createGoogleCampaign(user, payload) {
  const { name, budget } = payload;

  if (!name || !budget) {
    throw httpError('Missing required fields', 400, 'MISSING_FIELDS');
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
  const customerId = accountId.replace(/-/g, ''); // Google expects ID without dashes

  // Google Ads API requires a Developer Token for real calls.
  // For testing in "Test Accounts", the developer token might be bypassed if using the right MCC.
  const headers = {
    'Authorization': `Bearer ${accessToken}`,
    'developer-token': (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim(),
    'Content-Type': 'application/json',
  };

  const baseUrl = `${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_VERSION}/customers/${customerId}`;

  // 1. Create Campaign Budget (PAUSED / Micros)
  const budgetRes = await fetch(`${baseUrl}/campaignBudgets:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          name: `${name} Budget`,
          amountMicros: parseInt(budget) * 1000000, // Google uses micros
          deliveryMethod: 'STANDARD',
        }
      }]
    })
  });
  
  const budgetData = await budgetRes.json();
  if (!budgetRes.ok || budgetData.error) {
    console.error('Google Budget Error:', budgetData);
    throw httpError(budgetData.error?.message || 'Google Budget API Error', 400, 'GOOGLE_BUDGET_ERROR');
  }
  const budgetResourceName = budgetData.results[0].resourceName;

  // 2. Create Campaign (PAUSED for safety)
  const campaignRes = await fetch(`${baseUrl}/campaigns:mutate`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      operations: [{
        create: {
          name,
          status: 'PAUSED',
          advertisingChannelType: 'SEARCH',
          manualCpc: {}, // Required for Search campaigns without automated bidding
          campaignBudget: budgetResourceName,
        }
      }]
    })
  });

  const campaignData = await campaignRes.json();
  if (!campaignRes.ok || campaignData.error) {
    console.error('Google Campaign Error:', campaignData);
    throw httpError(campaignData.error?.message || 'Google Campaign API Error', 400, 'GOOGLE_CAMPAIGN_ERROR');
  }

  const campaignResourceName = campaignData.results[0].resourceName;

  // Note: To fully run an ad, you also need an AdGroup, Keywords, and Ad.
  // For MVP, we are just creating the Campaign shell.

  return {
    campaignResourceName,
    message: 'Google Campaign created successfully in PAUSED state.',
  };
}

module.exports = { createGoogleCampaign };