// services/knowledge/search.js
// ======================================================
// Advanced hybrid search:
//   1. Query expansion (LLM)
//   2. Vector search per variant (pgvector)
//   3. Keyword search per variant (tsvector)
//   4. Reciprocal Rank Fusion (RRF)
//   5. LLM reranking (top-K)
// ======================================================

const prisma = require('../../config/prisma');
const { embedTexts } = require('./embedder');
const { expandQuery } = require('./queryExpander');
const { rerank } = require('./reranker');

function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x)).join(",")}]`;
}

/**
 * Vector-only search for one query string.
 * @returns {Promise<Array>} - [{ chunkId, documentId, documentName, documentType, chunkIndex, content, vectorScore }]
 */
async function vectorSearch(organizationId, query, limit = 20, filters = {}) {
  const [embedding] = await embedTexts([query]);
  const vector = toVectorLiteral(embedding);

  const params = [vector, organizationId];
  const conditions = [`d."organizationId" = $2`];

  if (filters.docType) {
    params.push(filters.docType);
    conditions.push(`d.type = $${params.length}`);
  }
  if (filters.documentId) {
    params.push(filters.documentId);
    conditions.push(`d.id = $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT
      dc.id,
      dc."documentId" AS "documentId",
      dc."chunkIndex" AS "chunkIndex",
      dc.content,
      d.name AS "documentName",
      d.type AS "documentType",
      (dc.embedding <=> $1::vector) AS distance
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE ${conditions.join(' AND ')}
    ORDER BY dc.embedding <=> $1::vector
    LIMIT $${params.length}
  `;

  const rows = await prisma.$queryRawUnsafe(sql, ...params);

  return rows.map((r) => ({
    chunkId: r.id,
    documentId: r.documentId,
    documentName: r.documentName,
    documentType: r.documentType,
    chunkIndex: Number(r.chunkIndex),
    content: r.content,
    vectorScore: 1 - Number(r.distance),
  }));
}

/**
 * Keyword-only search (tsvector) for one query string.
 */
async function keywordSearch(organizationId, query, limit = 20, filters = {}) {
  const params = [query, organizationId];
  const conditions = [
    `d."organizationId" = $2`,
    `to_tsvector('english', dc.content) @@ plainto_tsquery('english', $1)`,
  ];

  if (filters.docType) {
    params.push(filters.docType);
    conditions.push(`d.type = $${params.length}`);
  }
  if (filters.documentId) {
    params.push(filters.documentId);
    conditions.push(`d.id = $${params.length}`);
  }

  params.push(limit);

  const sql = `
    SELECT
      dc.id,
      dc."documentId" AS "documentId",
      dc."chunkIndex" AS "chunkIndex",
      dc.content,
      d.name AS "documentName",
      d.type AS "documentType",
      ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', $1)) AS rank
    FROM "DocumentChunk" dc
    JOIN "Document" d ON d.id = dc."documentId"
    WHERE ${conditions.join(' AND ')}
    ORDER BY rank DESC
    LIMIT $${params.length}
  `;

  try {
    const rows = await prisma.$queryRawUnsafe(sql, ...params);
    return rows.map((r) => ({
      chunkId: r.id,
      documentId: r.documentId,
      documentName: r.documentName,
      documentType: r.documentType,
      chunkIndex: Number(r.chunkIndex),
      content: r.content,
      keywordScore: Number(r.rank),
    }));
  } catch (err) {
    // GIN index missing → keyword search fails; skip gracefully
    console.warn('[search] keyword search failed:', err.message);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion — merge ranked lists.
 */
function rrfMerge(lists, k = 60) {
  const scores = new Map(); // chunkId → { entry, rrf }
  for (const list of lists) {
    list.forEach((entry, idx) => {
      const rank = idx + 1;
      const inc = 1 / (k + rank);
      const existing = scores.get(entry.chunkId);
      if (existing) {
        existing.rrf += inc;
        // merge score types
        if (entry.vectorScore != null && existing.entry.vectorScore == null) {
          existing.entry.vectorScore = entry.vectorScore;
        }
        if (entry.keywordScore != null && existing.entry.keywordScore == null) {
          existing.entry.keywordScore = entry.keywordScore;
        }
      } else {
        scores.set(entry.chunkId, { entry: { ...entry }, rrf: inc });
      }
    });
  }
  return Array.from(scores.values())
    .sort((a, b) => b.rrf - a.rrf)
    .map((x) => ({ ...x.entry, rrf: x.rrf }));
}

/**
 * Main hybrid search entrypoint.
 */
async function search(user, query, options = {}) {
  if (!user.organizationId) return { query, results: [] };
  if (!query || !query.trim()) return { query, results: [] };

  const limit = Math.min(Number(options.limit) || 5, 20);
  const candidatesPerList = Math.min(limit * 3, 30); // overshoot for RRF
  const useExpansion = options.expand !== false;
  const useRerank = options.rerank !== false;

  const filters = {
    docType: options.docType || null,
    documentId: options.documentId || null,
  };

  // 1. Query expansion
  const queries = useExpansion
    ? await expandQuery(query.trim())
    : [query.trim()];

  // 2. Run vector + keyword search for each variant (parallel)
  const searchTasks = [];
  for (const q of queries) {
    searchTasks.push(vectorSearch(user.organizationId, q, candidatesPerList, filters));
    searchTasks.push(keywordSearch(user.organizationId, q, candidatesPerList, filters));
  }

  const listResults = await Promise.allSettled(searchTasks);
  const rankedLists = listResults
    .filter((r) => r.status === 'fulfilled' && Array.isArray(r.value) && r.value.length > 0)
    .map((r) => r.value);

  if (rankedLists.length === 0) {
    return { query, expandedQueries: queries, results: [] };
  }

  // 3. RRF merge
  const merged = rrfMerge(rankedLists);

  // 4. Optional: LLM rerank top N
  const rerankPool = merged.slice(0, Math.min(15, merged.length));
  const final = useRerank
    ? await rerank(query.trim(), rerankPool, { topK: limit })
    : merged.slice(0, limit);

  return {
    query,
    expandedQueries: queries,
    results: final.map((r) => ({
      chunkId: r.chunkId,
      documentId: r.documentId,
      documentName: r.documentName,
      documentType: r.documentType,
      chunkIndex: r.chunkIndex,
      content: r.content,
      // unified similarity (best available)
      similarity: r.vectorScore != null
        ? Math.round(r.vectorScore * 100) / 100
        : r.rrf
        ? Math.round(Math.min(r.rrf * 10, 1) * 100) / 100
        : 0,
      vectorScore: r.vectorScore ?? null,
      keywordScore: r.keywordScore ?? null,
      rrf: r.rrf ? Math.round(r.rrf * 1000) / 1000 : null,
      rerankRank: r.rerankRank ?? null,
    })),
  };
}

async function listDocuments(user, options = {}) {
  if (!user.organizationId) return { documents: [] };

  const where = { organizationId: user.organizationId };
  if (options.docType) where.type = options.docType;

  const docs = await prisma.document.findMany({
    where,
    include: { _count: { select: { chunks: true } } },
    orderBy: { createdAt: 'desc' },
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