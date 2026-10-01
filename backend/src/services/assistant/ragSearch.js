// services/assistant/ragSearch.js
// ======================================================
// RAG — find relevant brand document chunks
// ======================================================

const prisma = require('../../config/prisma');
const { embedTexts } = require('../knowledge/embedder');

const DEFAULT_LIMIT = 3;
const MAX_DISTANCE = 0.65;   // cosine distance threshold (lower = more similar)

function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x)).join(",")}]`;
}

async function searchDocs(organizationId, query, limit = DEFAULT_LIMIT) {
  if (!organizationId) return [];
  if (!query || !query.trim()) return [];

  try {
    const [embedding] = await embedTexts([query.trim()]);
    const vector = toVectorLiteral(embedding);

    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         dc.content,
         d.name AS "docName",
         (dc.embedding <=> $1::vector) AS distance
       FROM "DocumentChunk" dc
       JOIN "Document" d ON d.id = dc."documentId"
       WHERE d."organizationId" = $2
       ORDER BY dc.embedding <=> $1::vector
       LIMIT $3`,
      vector,
      organizationId,
      limit
    );

    return rows
      .filter((r) => Number(r.distance) < MAX_DISTANCE)
      .map((r) => ({
        content: r.content,
        source: r.docName,
        similarity: Math.round((1 - Number(r.distance)) * 100) / 100,
      }));
  } catch (err) {
    console.warn('[assistant.ragSearch] failed:', err.message);
    return [];
  }
}

module.exports = { searchDocs };