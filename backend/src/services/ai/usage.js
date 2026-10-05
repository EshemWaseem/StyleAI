// services/ai/usage.js
// ======================================================
// Log AI calls + aggregate usage for dashboard.
// ======================================================

const prisma = require('../../config/prisma');
const { estimateCost, estimateTokens } = require('./pricing');

/**
 * Record an AI call. Fire-and-forget — never throws.
 */
async function trackUsage({
  modelName,
  provider,
  taskType,
  userId = null,
  organizationId = null,
  inputTokens = 0,
  outputTokens = 0,
  latencyMs = null,
  status = 'SUCCESS',
  errorMessage = null,
  route = null,
  requestId = null,
  meta = null,
  inputText = null,
  outputText = null,
}) {
  try {
    // Auto-estimate tokens if not provided
    const inTok = inputTokens || (inputText ? estimateTokens(inputText) : 0);
    const outTok = outputTokens || (outputText ? estimateTokens(outputText) : 0);
    const totalTok = inTok + outTok;

    const cost = estimateCost({
      provider,
      modelName,
      inputTokens: inTok,
      outputTokens: outTok,
    });

    // Try to link to registered model
    let modelId = null;
    try {
      const m = await prisma.aIModel.findFirst({
        where: { name: modelName, provider },
        select: { id: true },
      });
      modelId = m?.id || null;
    } catch { /* ignore */ }

    const row = await prisma.aIUsage.create({
      data: {
        modelId,
        modelName: modelName || 'unknown',
        provider: provider || 'unknown',
        taskType: taskType || 'unknown',
        userId,
        organizationId,
        inputTokens: inTok,
        outputTokens: outTok,
        totalTokens: totalTok,
        cost,
        latencyMs,
        status,
        errorMessage,
        route,
        requestId,
        meta: meta || undefined,
      },
    });
    return row;
  } catch (err) {
    console.error('[ai.usage] track failed:', err.message);
    return null;
  }
}

/**
 * Aggregate stats for the admin dashboard.
 * @param {Object} opts - { sinceHours?: number }
 */
async function getUsageStats({ sinceHours = 24 } = {}) {
  const since = new Date(Date.now() - sinceHours * 60 * 60 * 1000);

  const [rows, total] = await Promise.all([
    prisma.aIUsage.findMany({
      where: { createdAt: { gte: since } },
      select: {
        status: true, latencyMs: true, cost: true,
        inputTokens: true, outputTokens: true, totalTokens: true,
        provider: true, modelName: true, taskType: true,
      },
    }),
    prisma.aIUsage.count({ where: { createdAt: { gte: since } } }),
  ]);

  const ok = rows.filter((r) => r.status === 'SUCCESS');
  const errs = rows.filter((r) => r.status !== 'SUCCESS');

  const totalCost = rows.reduce((s, r) => s + Number(r.cost || 0), 0);
  const totalTokens = rows.reduce((s, r) => s + Number(r.totalTokens || 0), 0);

  const latencies = ok.map((r) => r.latencyMs).filter((v) => Number.isFinite(v));
  const avgLatency = latencies.length
    ? Math.round(latencies.reduce((s, v) => s + v, 0) / latencies.length)
    : 0;

  const successRate = total > 0 ? (ok.length / total) * 100 : 100;

  // Breakdown by provider
  const byProvider = {};
  for (const r of rows) {
    const k = r.provider || 'unknown';
    byProvider[k] = byProvider[k] || { calls: 0, cost: 0, tokens: 0, errors: 0 };
    byProvider[k].calls += 1;
    byProvider[k].cost += Number(r.cost || 0);
    byProvider[k].tokens += Number(r.totalTokens || 0);
    if (r.status !== 'SUCCESS') byProvider[k].errors += 1;
  }

  // Breakdown by taskType
  const byTask = {};
  for (const r of rows) {
    const k = r.taskType || 'unknown';
    byTask[k] = byTask[k] || { calls: 0, cost: 0 };
    byTask[k].calls += 1;
    byTask[k].cost += Number(r.cost || 0);
  }

  return {
    sinceHours,
    totalCalls: total,
    successCalls: ok.length,
    errorCalls: errs.length,
    successRate: Math.round(successRate * 100) / 100,
    avgLatencyMs: avgLatency,
    totalCost: Math.round(totalCost * 10000) / 10000,
    totalTokens,
    byProvider,
    byTask,
  };
}

/**
 * Daily usage timeline for the last N days.
 */
async function getUsageTimeline({ days = 7 } = {}) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.aIUsage.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true, cost: true, status: true, totalTokens: true },
    orderBy: { createdAt: 'asc' },
  });

  const buckets = {};
  for (let i = 0; i < days; i++) {
    const d = new Date(Date.now() - (days - 1 - i) * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, calls: 0, cost: 0, tokens: 0, errors: 0 };
  }

  for (const r of rows) {
    const key = r.createdAt.toISOString().slice(0, 10);
    if (!buckets[key]) continue;
    buckets[key].calls += 1;
    buckets[key].cost += Number(r.cost || 0);
    buckets[key].tokens += Number(r.totalTokens || 0);
    if (r.status !== 'SUCCESS') buckets[key].errors += 1;
  }

  return Object.values(buckets).map((b) => ({
    ...b,
    cost: Math.round(b.cost * 10000) / 10000,
  }));
}

/**
 * Recent usage rows (for the dashboard table).
 */
async function listRecentUsage({ limit = 50, offset = 0, provider, status } = {}) {
  const where = {};
  if (provider) where.provider = provider;
  if (status) where.status = status;

  const [rows, total] = await Promise.all([
    prisma.aIUsage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(limit) || 50, 200),
      skip: Number(offset) || 0,
    }),
    prisma.aIUsage.count({ where }),
  ]);

  return {
    usages: rows.map((r) => ({
      id: r.id,
      modelName: r.modelName,
      provider: r.provider,
      taskType: r.taskType,
      status: r.status,
      latencyMs: r.latencyMs,
      inputTokens: r.inputTokens,
      outputTokens: r.outputTokens,
      totalTokens: r.totalTokens,
      cost: Number(r.cost),
      userId: r.userId,
      organizationId: r.organizationId,
      route: r.route,
      errorMessage: r.errorMessage,
      createdAt: r.createdAt,
    })),
    total,
    limit,
    offset,
  };
}

module.exports = { trackUsage, getUsageStats, getUsageTimeline, listRecentUsage };