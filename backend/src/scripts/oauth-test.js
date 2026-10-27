require('dotenv').config();

const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const B = '\x1b[36m';
const D = '\x1b[2m';
const X = '\x1b[0m';
const BOLD = '\x1b[1m';

let passed = 0;
let failed = 0;
let warnings = 0;
let skipped = 0;
const lines = [];

function section(title) {
  lines.push('\n' + BOLD + B + '══ ' + title + ' ══' + X);
}
function pass(label, detail = '') {
  passed++;
  lines.push(`  ${G}✅${X} ${label}${detail ? ' ' + D + detail + X : ''}`);
}
function fail(label, detail = '') {
  failed++;
  lines.push(`  ${R}❌${X} ${label}${detail ? ' ' + R + detail + X : ''}`);
}
function warn(label, detail = '') {
  warnings++;
  lines.push(`  ${Y}⚠ ${X} ${label}${detail ? ' ' + D + detail + X : ''}`);
}
function skip(label, detail = '') {
  skipped++;
  lines.push(`  ${D}⏭ ${label}${detail ? ' ' + detail : ''}${X}`);
}
function info(label, detail = '') {
  lines.push(`  ${D}ℹ ${label}${detail ? ' ' + detail : ''}${X}`);
}
function mask(v) {
  if (!v) return '***';
  if (v.length <= 12) return '***';
  return v.slice(0, 6) + '...' + v.slice(-4);
}

function checkEnv() {
  section('Environment');

  const required = [
    'META_APP_ID', 'META_APP_SECRET', 'META_REDIRECT_URI',
    'GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET', 'GOOGLE_REDIRECT_URI',
    'FRONTEND_URL',
  ];
  const urlKeys = ['META_REDIRECT_URI', 'GOOGLE_REDIRECT_URI'];

  for (const key of required) {
    const v = process.env[key];
    if (!v) {
      fail(key, 'not set');
      continue;
    }
    if (urlKeys.includes(key)) {
      try {
        const u = new URL(v);
        if (!u.pathname.endsWith('/callback')) {
          warn(key, `${v} (expected to end with /callback)`);
        } else {
          pass(key, v);
        }
      } catch {
        fail(key, `invalid URL: ${v}`);
      }
    } else {
      pass(key, mask(v));
    }
  }

  const jwtSecret = process.env.OAUTH_STATE_SECRET || process.env.JWT_SECRET;
  if (!jwtSecret) fail('JWT_SECRET / OAUTH_STATE_SECRET', 'not set (state signing will fail)');
  else pass('JWT_SECRET / OAUTH_STATE_SECRET', jwtSecret.length + ' chars');

  if (process.env.META_REDIRECT_URI && !process.env.META_REDIRECT_URI.includes('/integrations/META/callback')) {
    warn('META_REDIRECT_URI', 'path should be /api/agency/integrations/META/callback');
  }
  if (process.env.GOOGLE_REDIRECT_URI && !process.env.GOOGLE_REDIRECT_URI.includes('/integrations/GOOGLE/callback')) {
    warn('GOOGLE_REDIRECT_URI', 'path should be /api/agency/integrations/GOOGLE/callback');
  }

  if (process.env.FRONTEND_URL) {
    const origins = process.env.FRONTEND_URL.split(',').map((s) => s.trim()).filter(Boolean);
    info('FRONTEND_URL origins', origins.join(', '));
  }
}

async function checkDb() {
  section('Database');
  let prisma;
  try {
    prisma = require('../config/prisma');
    await prisma.$queryRaw`SELECT 1`;
    pass('Prisma connection');
  } catch (e) {
    fail('Prisma connection', e.message);
    return;
  }

  try {
    const result = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'AgencyAdAccount'
      ) AS exists
    `;
    if (result[0]?.exists) pass('AgencyAdAccount table exists');
    else fail('AgencyAdAccount table', 'missing — run npx prisma db push');
  } catch (e) {
    fail('AgencyAdAccount check', e.message);
  }

  try {
    const rows = await prisma.agencyAdAccount.findMany({
      select: { provider: true, accountId: true, accountName: true, isActive: true, tokenExpiresAt: true },
    });
    const counts = { META: 0, GOOGLE: 0 };
    for (const r of rows) counts[r.provider] = (counts[r.provider] || 0) + 1;
    info('Existing connections', `META: ${counts.META}, GOOGLE: ${counts.GOOGLE}`);
    for (const r of rows) {
      const expired = r.tokenExpiresAt && new Date(r.tokenExpiresAt) < new Date();
      const flag = !r.isActive ? `${R}INACTIVE${X}` : expired ? `${Y}EXPIRED${X}` : `${G}OK${X}`;
      info(`  ${r.provider}`, `${r.accountName} (${r.accountId}) ${flag}`);
    }
  } catch (e) {
    warn('Cannot list connections', e.message);
  }
}

async function checkOAuthUrls() {
  section('OAuth URL generation');
  let ads;
  try {
    ads = require('../services/agency/ads');
  } catch (e) {
    fail('Cannot load ads service', e.message);
    return;
  }

  const mockUser = { id: 'test-user-id', organizationId: 'test-org-id' };

  for (const provider of ['META', 'GOOGLE']) {
    try {
      const url = await ads.getOAuthUrl(mockUser, provider);
      const p = new URL(url);
      const checks = [];

      if (provider === 'META') {
        if (p.hostname === 'www.facebook.com') checks.push('host');
        if (p.searchParams.get('client_id') === process.env.META_APP_ID) checks.push('client_id');
        if (p.searchParams.get('redirect_uri') === process.env.META_REDIRECT_URI) checks.push('redirect_uri');
        const sc = p.searchParams.get('scope') || '';
        if (sc.includes('ads_management') && sc.includes('ads_read')) checks.push('scopes');
        if (p.searchParams.get('state')) checks.push('state');
      } else {
        if (p.hostname === 'accounts.google.com') checks.push('host');
        if (p.searchParams.get('client_id') === process.env.GOOGLE_CLIENT_ID) checks.push('client_id');
        if (p.searchParams.get('redirect_uri') === process.env.GOOGLE_REDIRECT_URI) checks.push('redirect_uri');
        if ((p.searchParams.get('scope') || '').includes('adwords')) checks.push('scope');
        if (p.searchParams.get('access_type') === 'offline') checks.push('offline');
        if (p.searchParams.get('state')) checks.push('state');
      }
      pass(`${provider} auth URL`, checks.join(', '));
    } catch (e) {
      fail(`${provider} auth URL`, e.message);
    }
  }
}

async function checkEndpoints() {
  section('HTTP endpoints');
  const base = (process.env.API_URL || 'http://localhost:4000').replace(/\/$/, '');

  try {
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) pass('GET /api/health', `status ${res.status}`);
    else fail('GET /api/health', `status ${res.status}`);
  } catch (e) {
    skip('GET /api/health', `backend not running (${e.code || e.message})`);
  }

  for (const provider of ['META', 'GOOGLE']) {
    try {
      const res = await fetch(`${base}/api/agency/integrations/${provider}/callback`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(3000),
      });
      if (res.status === 302 || res.status === 303) {
        const loc = res.headers.get('location') || '';
        if (loc.includes('/agency') && loc.includes('connected=false')) {
          pass(`GET /callback (${provider})`, 'redirects to frontend ✓');
        } else {
          warn(`GET /callback (${provider})`, `302 → ${loc}`);
        }
      } else {
        fail(`GET /callback (${provider})`, `status ${res.status} (expected 302)`);
      }
    } catch (e) {
      skip(`GET /callback (${provider})`, `backend not running (${e.code || e.message})`);
    }
  }
}

function printChecklist() {
  section('Manual browser test (must do)');
  const frontend = (process.env.FRONTEND_URL || '').split(',')[0].trim() || 'http://localhost:3000';
  let metaHost = '???';
  try { metaHost = new URL(process.env.META_REDIRECT_URI).hostname; } catch {}
  let googleUri = process.env.GOOGLE_REDIRECT_URI || '???';
  let metaUri = process.env.META_REDIRECT_URI || '???';

  lines.push(`  1. Browser: ${frontend}/agency`);
  lines.push(`  2. "Google Ads" card → Connect → test user se login`);
  lines.push(`  3. Authorize → wapas /agency?connected=true&provider=GOOGLE aana chahiye`);
  lines.push(`  4. "Meta Ads" card → Connect → same steps`);
  lines.push(`  5. Verify: npx prisma studio → AgencyAdAccount table me row`);
  lines.push('');
  lines.push(`  ${D}Meta Dashboard (developers.facebook.com):${X}`);
  lines.push(`  ${D}  App Domains             = ${metaHost}${X}`);
  lines.push(`  ${D}  Valid OAuth Redirect URIs = ${metaUri}${X}`);
  lines.push('');
  lines.push(`  ${D}Google Console (console.cloud.google.com):${X}`);
  lines.push(`  ${D}  Authorized redirect URIs  = ${googleUri}${X}`);
}

(async () => {
  console.log('\n' + BOLD + '═'.repeat(64) + X);
  console.log(BOLD + '  StyleAI OAuth Health Check' + X);
  console.log(BOLD + '═'.repeat(64) + X);

  checkEnv();
  await checkDb();
  await checkOAuthUrls();
  await checkEndpoints();
  printChecklist();

  console.log(lines.join('\n'));

  console.log('\n' + BOLD + '═'.repeat(64) + X);
  const failedStr = failed > 0 ? R + `Failed: ${failed}` + X : D + 'Failed: 0' + X;
  const warnStr = warnings > 0 ? Y + `Warnings: ${warnings}` + X : D + 'Warnings: 0' + X;
  console.log(`  ${G}Passed: ${passed}${X}   ${failedStr}   ${warnStr}   ${D}Skipped: ${skipped}${X}`);
  console.log(BOLD + '═'.repeat(64) + X + '\n');

  if (failed > 0) {
    console.log(R + BOLD + '  ❌ Backend config me issues hain — upar fix karo.' + X + '\n');
    process.exit(1);
  }
  console.log(G + BOLD + '  ✅ Backend side ready. Ab browser checklist follow karo.' + X + '\n');
})().catch((e) => {
  console.error(R + 'Fatal: ' + e.message + X);
  process.exit(1);
});