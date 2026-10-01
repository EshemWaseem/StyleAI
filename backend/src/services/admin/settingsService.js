// services/admin/settingsService.js
const { getAllSettings, setSetting, writeAudit } = require('./helpers');

async function getAll() {
  return getAllSettings();
}

async function updateSettings(adminId, updates) {
  if (!updates || typeof updates !== 'object') {
    throw Object.assign(new Error('updates object required'), { status: 400 });
  }

  const results = [];
  for (const [key, payload] of Object.entries(updates)) {
    const { value, category, description } = payload || {};
    if (value === undefined) continue;
    const row = await setSetting(
      key, value,
      category || 'features',
      description || `Setting: ${key}`,
      adminId
    );
    results.push({ key: row.key, value: row.value, category: row.category });
  }

  await writeAudit({
    actorId: adminId,
    action: 'settings.update',
    targetType: 'PlatformSetting',
    targetId: 'all',
    meta: { updates },
  });

  return results;
}

module.exports = { getAll, updateSettings };