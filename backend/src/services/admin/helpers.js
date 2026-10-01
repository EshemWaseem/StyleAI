// helpers.js
const prisma = require('../../config/prisma');
const platformDefaults = require('../../config/platformSettings');

// ======================================================
// ERROR HELPER
// ======================================================
function httpError(message, status = 400, code = null) {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
}

// ======================================================
// ENSURE SUPER_ADMIN
// ======================================================
function assertSuperAdmin(user) {
  if (!user?.roles?.includes('SUPER_ADMIN')) {
    throw httpError('Forbidden: super admin only', 403, 'NOT_ADMIN');
  }
}

// ======================================================
// SETTINGS RESOLVER — DB value falls back to defaults
// ======================================================
async function getSetting(key, category) {
  const row = await prisma.platformSetting.findUnique({ where: { key } });
  if (row) return row.value;
  return platformDefaults[category]?.[key] ?? null;
}

async function getAllSettings() {
  const rows = await prisma.platformSetting.findMany();
  const overrides = Object.fromEntries(rows.map((r) => [r.key, r.value]));

  const resolved = {};
  for (const [category, values] of Object.entries(platformDefaults)) {
    resolved[category] = { ...values };
    for (const key of Object.keys(values)) {
      if (key in overrides) resolved[category][key] = overrides[key];
    }
  }
  return resolved;
}

async function setSetting(key, value, category, description, adminId) {
  return prisma.platformSetting.upsert({
    where: { key },
    update: { value, category, description, updatedBy: adminId },
    create: { key, value, category, description, updatedBy: adminId },
  });
}

// ======================================================
// AUDIT LOG
// ======================================================
async function writeAudit({
  actorId,
  action,
  targetType,
  targetId,
  meta = null,
  ipAddress = null,
}) {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, targetType, targetId, meta, ipAddress },
    });
  } catch (err) {
    // Non-fatal — audit log failure shouldn't break the action
    console.error('[audit] Failed to write log:', err.message);
  }
}

// ======================================================
// PAGINATION
// ======================================================
function parsePagination(query) {
  const limit = Math.min(Number(query.limit) || 50, 200);
  const offset = Math.max(Number(query.offset) || 0, 0);
  return { limit, offset };
}

module.exports = {
  httpError,
  assertSuperAdmin,
  getSetting,
  getAllSettings,
  setSetting,
  writeAudit,
  parsePagination,
};