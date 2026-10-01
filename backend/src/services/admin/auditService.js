// services/admin/auditService.js
const prisma = require('../../config/prisma');
const { parsePagination } = require('./helpers');

async function listAuditLogs(query = {}) {
  const { limit, offset } = parsePagination(query);

  const where = {};
  if (query.action) where.action = { startsWith: query.action };
  if (query.actorId) where.actorId = query.actorId;
  if (query.targetType) where.targetType = query.targetType;

  const [rows, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // Attach actor info
  const actorIds = [...new Set(rows.map((r) => r.actorId).filter(Boolean))];
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true, email: true },
  });
  const actorMap = Object.fromEntries(actors.map((a) => [a.id, a]));

  return {
    logs: rows.map((r) => ({
      id: r.id,
      action: r.action,
      targetType: r.targetType,
      targetId: r.targetId,
      meta: r.meta,
      ipAddress: r.ipAddress,
      createdAt: r.createdAt,
      actor: actorMap[r.actorId] || { id: r.actorId, name: '—', email: '—' },
    })),
    total, limit, offset,
  };
}

module.exports = { listAuditLogs };