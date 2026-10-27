// services/agency/ads.js
const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const jwt = require('jsonwebtoken');

const GRAPH_VERSION = (process.env.META_GRAPH_VERSION || 'v20.0').trim();
const GRAPH_BASE_URL = (process.env.META_GRAPH_BASE_URL || 'https://graph.facebook.com').trim();
const META_OAUTH_BASE_URL = (process.env.META_OAUTH_BASE_URL || 'https://www.facebook.com').trim();

const GOOGLE_OAUTH_URL = (process.env.GOOGLE_OAUTH_URL || 'https://accounts.google.com/o/oauth2/v2/auth').trim();
const GOOGLE_TOKEN_URL = (process.env.GOOGLE_TOKEN_URL || 'https://oauth2.googleapis.com/token').trim();
const GOOGLE_ADS_VERSION = (process.env.GOOGLE_ADS_API_VERSION || 'v17').trim();
const GOOGLE_ADS_BASE_URL = (process.env.GOOGLE_ADS_BASE_URL || 'https://googleads.googleapis.com').trim();

function stateSecret() {
  const s = (process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET || '').trim();
  if (!s) throw httpError('OAUTH_STATE_SECRET or JWT_SECRET not set', 500, 'NO_STATE_SECRET');
  return s;
}

function signState({ organizationId, userId, provider }) {
  return jwt.sign(
    { orgId: organizationId, userId, provider },
    stateSecret(),
    { expiresIn: '10m' }
  );
}

function verifyState(token) {
  try {
    return jwt.verify(token, stateSecret());
  } catch {
    throw httpError('Invalid or expired OAuth state', 400, 'INVALID_STATE');
  }
}

async function listAdAccounts(user) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
  return prisma.agencyAdAccount.findMany({
    where: { agencyOrganizationId: user.organizationId },
    select: {
      id: true, provider: true, accountId: true, accountName: true,
      tokenExpiresAt: true, isActive: true, createdAt: true, updatedAt: true,
    },
  });
}

async function getOAuthUrl(user, provider) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');

  const state = signState({
    organizationId: user.organizationId,
    userId: user.id,
    provider,
  });

  if (provider === 'META') {
    const appId = (process.env.META_APP_ID || '').trim();
    const redirectUri = (process.env.META_REDIRECT_URI || '').trim();
    if (!appId || !redirectUri) throw httpError('Meta OAuth not configured', 500, 'META_NOT_CONFIGURED');
    
    const url = new URL(`${META_OAUTH_BASE_URL}/${GRAPH_VERSION}/dialog/oauth`);
    url.searchParams.set('client_id', appId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('state', state);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', ['public_profile', 'business_management', 'ads_management', 'ads_read'].join(','));
    return url.toString();
  }

  if (provider === 'GOOGLE') {
    const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
    const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();
    if (!clientId || !redirectUri) throw httpError('Google OAuth not configured', 500, 'GOOGLE_NOT_CONFIGURED');

    const url = new URL(GOOGLE_OAUTH_URL);
    url.searchParams.set('client_id', clientId);
    url.searchParams.set('redirect_uri', redirectUri);
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('state', state);
    return url.toString();
  }

  throw httpError('Invalid provider', 400, 'INVALID_PROVIDER');
}

async function handleOAuthCallback(provider, code, state) {
  const decoded = verifyState(state);
  if (decoded.provider !== provider) throw httpError('Provider mismatch', 400, 'PROVIDER_MISMATCH');
  const organizationId = decoded.orgId;
  if (!organizationId) throw httpError('Missing organization', 400, 'MISSING_ORG');

  if (provider === 'META') return handleMetaCallback(organizationId, code);
  if (provider === 'GOOGLE') return handleGoogleCallback(organizationId, code);

  throw httpError('Invalid provider', 400, 'INVALID_PROVIDER');
}

async function handleMetaCallback(organizationId, code) {
  const appId = (process.env.META_APP_ID || '').trim();
  const appSecret = (process.env.META_APP_SECRET || '').trim();
  const redirectUri = (process.env.META_REDIRECT_URI || '').trim();

  if (!appId || !appSecret || !redirectUri) throw httpError('Meta credentials missing', 500, 'META_NOT_CONFIGURED');

  const shortUrl = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/oauth/access_token`);
  shortUrl.searchParams.set('client_id', appId);
  shortUrl.searchParams.set('client_secret', appSecret);
  shortUrl.searchParams.set('redirect_uri', redirectUri);
  shortUrl.searchParams.set('code', code);

  // 🔥 FIXED: Added 'Accept-Encoding': 'identity' to prevent compressed garbage response
  const shortRes = await fetch(shortUrl.toString(), {
    headers: { 
      'Accept-Encoding': 'identity',
      'Accept': 'application/json'
    }
  });
  
  const shortText = await shortRes.text(); 

  console.log("=== META RAW RESPONSE ===", shortText);

  let shortData = {};
  try { shortData = JSON.parse(shortText); } catch (e) {}

  if (!shortRes.ok || shortData.error) {
    throw httpError(
      `Meta token exchange failed: ${shortData?.error?.message || shortText || 'unknown error'}`,
      400,
      'META_TOKEN_FAILED'
    );
  }

  if (!shortData.access_token) {
    throw httpError(
      `Meta token exchange failed: No access_token. Response: ${shortText}`,
      400,
      'META_TOKEN_MISSING'
    );
  }

  const longUrl = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/oauth/access_token`);
  longUrl.searchParams.set('grant_type', 'fb_exchange_token');
  longUrl.searchParams.set('client_id', appId);
  longUrl.searchParams.set('client_secret', appSecret);
  longUrl.searchParams.set('fb_exchange_token', shortData.access_token);

  const longRes = await fetch(longUrl.toString(), {
    headers: { 
      'Accept-Encoding': 'identity',
      'Accept': 'application/json'
    }
  });
  const longText = await longRes.text();
  let longData = {};
  try { longData = JSON.parse(longText); } catch (e) {}

  if (!longRes.ok || longData.error) {
    throw httpError(
      `Meta long-lived token failed: ${longData?.error?.message || longText || 'unknown error'}`,
      400,
      'META_LONG_TOKEN_FAILED'
    );
  }

  if (!longData.access_token) {
    throw httpError('Meta long-lived token failed: No access_token in response', 400, 'META_LONG_TOKEN_MISSING');
  }

  const accessToken = longData.access_token;
  const expiresIn = longData.expires_in || 60 * 24 * 60 * 60;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  const accUrl = new URL(`${GRAPH_BASE_URL}/${GRAPH_VERSION}/me/adaccounts`);
  accUrl.searchParams.set('fields', 'id,account_id,name,currency,account_status');
  accUrl.searchParams.set('limit', '100');
  accUrl.searchParams.set('access_token', accessToken);

  const accRes = await fetch(accUrl, {
    headers: { 
      'Accept-Encoding': 'identity',
      'Accept': 'application/json'
    }
  });
  const accData = await accRes.json().catch(() => ({}));
  
  if (!accRes.ok || accData.error) {
    throw httpError(
      `Meta ad accounts fetch failed: ${accData?.error?.message || 'unknown error'}`,
      400,
      'META_ACCOUNTS_FAILED'
    );
  }

  const accounts = (accData.data || []).map((a) => ({
    id: a.id, accountId: a.account_id, name: a.name, currency: a.currency, status: a.account_status,
  }));

  if (accounts.length === 0) {
    throw httpError(
      'No Meta ad accounts found. Please create an ad account in Meta Business Suite first, then reconnect.',
      400, 'NO_META_ACCOUNTS'
    );
  }

  const primary = accounts[0];

  const record = await prisma.agencyAdAccount.upsert({
    where: { agencyOrganizationId_provider: { agencyOrganizationId: organizationId, provider: 'META' } },
    create: {
      agencyOrganizationId: organizationId, provider: 'META',
      accountId: primary.accountId, accountName: primary.name,
      accessToken, refreshToken: null, tokenExpiresAt, isActive: true,
    },
    update: {
      accountId: primary.accountId, accountName: primary.name,
      accessToken, refreshToken: null, tokenExpiresAt, isActive: true,
    },
  });

  return { record, accounts, primary };
}

async function handleGoogleCallback(organizationId, code) {
  const clientId = (process.env.GOOGLE_CLIENT_ID || '').trim();
  const clientSecret = (process.env.GOOGLE_CLIENT_SECRET || '').trim();
  const redirectUri = (process.env.GOOGLE_REDIRECT_URI || '').trim();

  if (!clientId || !clientSecret || !redirectUri) throw httpError('Google credentials missing', 500, 'GOOGLE_NOT_CONFIGURED');

  const body = new URLSearchParams({
    code, client_id: clientId, client_secret: clientSecret,
    redirect_uri: redirectUri, grant_type: 'authorization_code',
  });

  const tokenRes = await fetch(GOOGLE_TOKEN_URL, { method: 'POST', body });
  const tokenData = await tokenRes.json().catch(() => ({}));
  
  if (!tokenRes.ok || tokenData.error) {
    throw httpError(
      `Google token exchange failed: ${tokenData.error_description || tokenData.error || 'unknown error'}`,
      400, 'GOOGLE_TOKEN_FAILED'
    );
  }

  const accessToken = tokenData.access_token;
  const refreshToken = tokenData.refresh_token || null;
  const expiresIn = tokenData.expires_in || 3600;
  const tokenExpiresAt = new Date(Date.now() + expiresIn * 1000);

  let accounts = [];
  try {
    const accRes = await fetch(`${GOOGLE_ADS_BASE_URL}/${GOOGLE_ADS_VERSION}/customers:listAccessibleCustomers`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'developer-token': (process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '').trim(),
      },
    });
    if (accRes.ok) {
      const accData = await accRes.json();
      accounts = (accData.resourceNames || []).map((rn) => {
        const id = String(rn).split('/').pop();
        return { id, accountId: id, name: `Google Ads ${id}` };
      });
    }
  } catch (err) {
    console.warn('[google] failed to list customers:', err.message);
  }

  const primary = accounts[0];
  const accountId = primary?.accountId || '';
  const accountName = primary?.name || 'Google Ads account (no customer linked)';

  const record = await prisma.agencyAdAccount.upsert({
    where: { agencyOrganizationId_provider: { agencyOrganizationId: organizationId, provider: 'GOOGLE' } },
    create: {
      agencyOrganizationId: organizationId, provider: 'GOOGLE',
      accountId, accountName, accessToken, refreshToken, tokenExpiresAt, isActive: true,
    },
    update: {
      accountId, accountName, accessToken, refreshToken, tokenExpiresAt, isActive: true,
    },
  });

  return { record, accounts, primary };
}

async function disconnectAdAccount(user, provider) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');
  await prisma.agencyAdAccount.deleteMany({
    where: { agencyOrganizationId: user.organizationId, provider },
  });
}

module.exports = {
  listAdAccounts, getOAuthUrl, handleOAuthCallback, disconnectAdAccount,
};