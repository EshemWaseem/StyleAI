// controllers/healthController.js
// ======================================================
// Health + readiness probes.
// GET /api/health          → liveness  (process alive)
// GET /api/health/ready    → readiness (DB, Redis, AI, Email)
// ======================================================
const prisma = require('../config/prisma');

async function liveness(req, res) {
  res.json({
    status: 'ok',
    service: 'styleai-backend',
    version: process.env.npm_package_version || '1.0.0',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  });
}

async function readiness(req, res) {
  const checks = {};
  let allOk = true;
  let criticalOk = true; // DB is critical; AI/Email are optional

  // --- Database (CRITICAL) ---
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    checks.database = { ok: false, error: err.message, latencyMs: Date.now() - t0 };
    allOk = false;
    criticalOk = false;
  }

  // --- Redis / Queue ---
  const t1 = Date.now();
  try {
    const { QUEUE_ENABLED, isHealthy } = require('../services/queue');
    if (QUEUE_ENABLED) {
      const ok = isHealthy();
      checks.redis = { ok, enabled: true, latencyMs: Date.now() - t1 };
      if (!ok) allOk = false; // warn, but not critical
    } else {
      checks.redis = { ok: true, enabled: false, note: 'QUEUE_ENABLED=false' };
    }
  } catch (err) {
    checks.redis = { ok: false, error: err.message };
    allOk = false;
  }

  // --- AI Service (optional) ---
  const t2 = Date.now();
  const aiUrl = process.env.AI_SERVICE_URL;
  if (aiUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 1500);
      const r = await fetch(`${aiUrl}/health`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timer);
      const ok = !!r?.ok;
      checks.aiService = { ok, latencyMs: Date.now() - t2 };
      if (!ok) allOk = false; // warn only
    } catch (err) {
      checks.aiService = { ok: false, error: err.message, latencyMs: Date.now() - t2 };
      allOk = false;
    }
  } else {
    checks.aiService = { ok: true, note: 'AI_SERVICE_URL not set' };
  }

  // --- Email (optional) ---
  try {
    const { EMAIL_ENABLED, getTransporter } = require('../services/email/transporter');
    if (EMAIL_ENABLED) {
      const tx = getTransporter();
      checks.email = { ok: !!tx, enabled: true };
    } else {
      checks.email = { ok: true, enabled: false, note: 'disabled' };
    }
  } catch (err) {
    checks.email = { ok: false, error: err.message };
  }

  // Status logic:
  // - criticalOk false → 503 (unhealthy)
  // - allOk true       → 200 (ready)
  // - allOk false      → 200 (degraded, but serving)
  const status = !criticalOk ? 'unhealthy' : allOk ? 'ready' : 'degraded';
  const httpStatus = !criticalOk ? 503 : 200;

  res.status(httpStatus).json({
    status,
    checks,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { liveness, readiness };