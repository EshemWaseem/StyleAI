// services/knowledge/search.js
// ======================================================
// Vector similarity search using pgvector
// ======================================================

const prisma = require('../../config/prisma');
const { embedTexts } = require('./embedder');

function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x)).join(",")}]`;
}

async function search(user, query, options = {}) {
  if (!user.organizationId) return { results: [] };
  if (!query || !query.trim()) return { results: [] };

  const limit = Math.min(Number(options.limit) || 5, 20);

  const [embedding] = await embedTexts([query.trim()]);
  const vector = toVectorLiteral(embedding);

  // pgvector: <=> is cosine distance (0 = identical, 2 = opposite)
  const rows = await prisma.$queryRawUnsafe(
    `SELECT
       dc.id,
       dc."documentId" AS "documentId",
       dc."chunkIndex" AS "chunkIndex",
       dc.content,
       d.name AS "documentName",
       d.type AS "documentType",
       (dc.embedding <=> $1::vector) AS distance
     FROM "DocumentChunk" dc
     JOIN "Document" d ON d.id = dc."documentId"
     WHERE d."organizationId" = $2
     ORDER BY dc.embedding <=> $1::vector
     LIMIT $3`,
    vector,
    user.organizationId,
    limit
  );

  return {
    query,
    results: rows.map((r) => ({
      chunkId: r.id,
      documentId: r.documentId,
      documentName: r.documentName,
      documentType: r.documentType,
      chunkIndex: Number(r.chunkIndex),
      content: r.content,
      similarity: Math.round((1 - Number(r.distance)) * 100) / 100,
    })),
  };
}

async function listDocuments(user, options = {}) {
  if (!user.organizationId) return { documents: [] };
  const docs = await prisma.document.findMany({
    where: { organizationId: user.organizationId },
    include: { _count: { select: { chunks: true } } },
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(options.limit) || 50, 100),
  });
  return { documents: docs.map((d) => shapeDoc(d)) };
}

function shapeDoc(d) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    storageUrl: d.storageUrl,
    status: d.status,
    error: d.error,
    chunkCount: d._count?.chunks ?? d.chunkCount ?? 0,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

async function stats(user) {
  if (!user.organizationId) return { documents: 0, chunks: 0 };
  const [docCount, chunkAgg] = await Promise.all([
    prisma.document.count({ where: { organizationId: user.organizationId } }),
    prisma.documentChunk.count({
      where: { document: { organizationId: user.organizationId } },
    }),
  ]);
  return { documents: docCount, chunks: chunkAgg };
}

module.exports = { search, listDocuments, stats };