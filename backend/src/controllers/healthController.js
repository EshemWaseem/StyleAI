// controllers/healthController.js
// ======================================================
// Health + readiness probes.
// GET /api/health          → liveness  (always 200 if process alive)
// GET /api/health/ready    → readiness (checks DB, AI, queue)
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

  // --- Database ---
  const t0 = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { ok: true, latencyMs: Date.now() - t0 };
  } catch (err) {
    checks.database = { ok: false, error: err.message, latencyMs: Date.now() - t0 };
    allOk = false;
  }

  // --- AI Service ---
  const t1 = Date.now();
  const aiUrl = process.env.AI_SERVICE_URL;
  if (aiUrl) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const r = await fetch(`${aiUrl}/health`, { signal: controller.signal });
      clearTimeout(timer);
      checks.aiService = { ok: r.ok, latencyMs: Date.now() - t1 };
      if (!r.ok) allOk = false;
    } catch (err) {
      checks.aiService = { ok: false, error: err.message, latencyMs: Date.now() - t1 };
      allOk = false;
    }
  } else {
    checks.aiService = { ok: false, error: 'AI_SERVICE_URL not set' };
    allOk = false;
  }

  // --- Email (transport ready) ---
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

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ready' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
}

module.exports = { liveness, readiness };