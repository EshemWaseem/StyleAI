// services/admin/finance.js
const prisma = require('../../config/prisma');
const { getAllSettings, setSetting, writeAudit } = require('./helpers');

const FINANCE_KEYS = [
  'brandCommissionPct', 'influencerCommissionPct',
  'bulkDiscountThreshold', 'bulkDiscountPct',
  'influencerBonusThreshold', 'influencerBonusPct',
  'minWithdrawalAmount', 'payoutHoldDays', 'currency',
];

async function getFinanceRules() {
  const all = await getAllSettings();
  const current = all.finance || {};
  return FINANCE_KEYS.map((key) => ({
    key,
    value: current[key] ?? null,
  }));
}

async function updateFinanceRules(adminId, updates) {
  if (!updates || typeof updates !== 'object') {
    throw Object.assign(new Error('updates object required'), { status: 400 });
  }

  const results = [];
  for (const [key, value] of Object.entries(updates)) {
    if (!FINANCE_KEYS.includes(key)) continue;
    const row = await setSetting(key, value, 'finance', `Finance rule: ${key}`, adminId);
    results.push({ key: row.key, value: row.value });
  }

  await writeAudit({
    actorId: adminId,
    action: 'finance.update',
    targetType: 'PlatformSetting',
    targetId: 'finance',
    meta: { updates },
  });

  return results;
}

module.exports = { getFinanceRules, updateFinanceRules };