// backend/scripts/smokeTest.js
// ======================================================
// End-to-end smoke test — verifies critical flows.
// Usage: node scripts/smokeTest.js
// ======================================================
require('dotenv').config();

const BASE = `http://localhost:${process.env.PORT || 4000}`;

const results = [];
const log = (name, ok, detail = '') => {
  results.push({ name, ok, detail });
  console.log(`${ok ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
};

async function fetchJson(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch {}
  return { status: res.status, json, text };
}

async function main() {
  console.log(`\n🧪 Smoke test @ ${BASE}\n${'─'.repeat(50)}`);

  // 1. Liveness
  try {
    const r = await fetchJson('/api/health');
    log('GET /api/health', r.status === 200 && r.json?.status === 'ok', `status=${r.status}`);
  } catch (e) { log('GET /api/health', false, e.message); }

  // 2. Readiness
  try {
    const r = await fetchJson('/api/health/ready');
    const ok = r.status === 200 || r.status === 503; // both acceptable, means endpoint works
    const dbOk = r.json?.checks?.database?.ok === true;
    log('GET /api/health/ready', ok, `status=${r.status}, db=${dbOk}`);
  } catch (e) { log('GET /api/health/ready', false, e.message); }

  // 3. Auth — bad login should be 401
  try {
    const r = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'nonexistent@x.com', password: 'wrong' }),
    });
    log('POST /api/auth/login (bad creds)', r.status === 401, `status=${r.status}`);
  } catch (e) { log('POST /api/auth/login (bad creds)', false, e.message); }

  // 4. Auth — real admin login
  let token = null;
  try {
    const r = await fetchJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: process.env.SMOKE_ADMIN_EMAIL || 'admin@styleai.com',
        password: process.env.SMOKE_ADMIN_PASS || 'Admin@123',
      }),
    });
    if (r.status === 200 && r.json?.token) {
      token = r.json.token;
      log('POST /api/auth/login (admin)', true, `user=${r.json.user?.email}`);
    } else {
      log('POST /api/auth/login (admin)', false, `status=${r.status}`);
    }
  } catch (e) { log('POST /api/auth/login (admin)', false, e.message); }

  // 5. Auth — /me
  if (token) {
    try {
      const r = await fetchJson('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      log('GET /api/auth/me', r.status === 200 && r.json?.user?.id, `email=${r.json?.user?.email}`);
    } catch (e) { log('GET /api/auth/me', false, e.message); }
  }

  // 6. Unauthorized access blocked
  try {
    const r = await fetchJson('/api/wallet/me');
    log('GET /api/wallet/me (no auth)', r.status === 401, `status=${r.status}`);
  } catch (e) { log('GET /api/wallet/me (no auth)', false, e.message); }

  // 7. Wallet — as admin (should return wallet or null)
  if (token) {
    try {
      const r = await fetchJson('/api/wallet/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      log('GET /api/wallet/me (auth)', r.status === 200, `status=${r.status}, hasWallet=${!!r.json?.wallet}`);
    } catch (e) { log('GET /api/wallet/me (auth)', false, e.message); }
  }

  // 8. Admin stats
  if (token) {
    try {
      const r = await fetchJson('/api/wallet/admin/stats', {
        headers: { Authorization: `Bearer ${token}` },
      });
      log('GET /api/wallet/admin/stats', r.status === 200, `currency=${r.json?.stats?.platformRevenue?.currency}`);
    } catch (e) { log('GET /api/wallet/admin/stats', false, e.message); }
  }

  try {
  const r = await fetchJson('/api/billing/plans?role=BRAND', {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = r.json;
  let plans = null;
  if (Array.isArray(body)) plans = body;
  else if (Array.isArray(body?.plans)) plans = body.plans;
  else if (Array.isArray(body?.data)) plans = body.data;
  else if (Array.isArray(body?.data?.plans)) plans = body.data.plans;
  else if (Array.isArray(body?.plans?.BRAND)) plans = body.plans.BRAND;

  const ok = r.status === 200 && plans !== null;
  log('GET /api/billing/plans', ok, ok ? `count=${plans.length}` : `status=${r.status}, shape=${Object.keys(body || {}).join(',')}`);
} catch (e) { log('GET /api/billing/plans', false, e.message); }

  // ------------------------------------------------------
  // Summary
  // ------------------------------------------------------
  console.log(`${'─'.repeat(50)}`);
  const passed = results.filter((r) => r.ok).length;
  const total = results.length;
  console.log(`\n📊 ${passed}/${total} passed\n`);

  process.exit(passed === total ? 0 : 1);
}

main().catch((e) => {
  console.error('Smoke test crashed:', e);
  process.exit(1);
});