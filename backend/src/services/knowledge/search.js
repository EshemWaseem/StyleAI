// services/knowledge/search.js
// ======================================================
// Advanced hybrid search:
//   1. Query expansion (LLM)
//   2. Vector search per variant (pgvector)
//   3. Keyword search per variant (tsvector + GIN)
//   4. Reciprocal Rank Fusion (RRF)
//   5. LLM reranking (top-K)
//   6. Similarity threshold + document diversity
// ======================================================

const prisma = require('../../config/prisma');
const { embedTexts } = require('./embedder');
const { expandQuery } = require('./queryExpander');
const { rerank } = require('./reranker');

// Tuneable thresholds
const MIN_SIMILARITY = 0.25;      // drop chunks below this vector score
const MAX_PER_DOCUMENT = 2;       // at most 2 chunks from same document

function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x)).join(",")}]`;
}

/**
 * Convert pgvector cosine distance → similarity in [0, 1].
 * pgvector `<=>` returns cosine distance in [0, 2]:
 *   0 = identical direction
 *   1 = orthogonal
 *   2 = opposite direction
 */
function distanceToSimilarity(distance) {
  const d = Number(distance);
  if (!Number.isFinite(d)) return 0;
  return Math.max(0, Math.min(1, 1 - d / 2));
}

/**
 * Vector-only search for one query string.
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
    vectorScore: distanceToSimilarity(r.distance),
  }));
}

/**
 * Keyword-only search (tsvector via generated column + GIN index).
 */
async function keywordSearch(organizationId, query, limit = 20, filters = {}) {
  const params = [query, organizationId];
  const conditions = [
    `d."organizationId" = $2`,
    `dc.content_ts @@ plainto_tsquery('english', $1)`,
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
      ts_rank(dc.content_ts, plainto_tsquery('english', $1)) AS rank
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
    console.warn('[search] keyword search failed:', err.message);
    return [];
  }
}

/**
 * Reciprocal Rank Fusion — merge ranked lists.
 */
function rrfMerge(lists, k = 60) {
  const scores = new Map();
  for (const list of lists) {
    list.forEach((entry, idx) => {
      const rank = idx + 1;
      const inc = 1 / (k + rank);
      const existing = scores.get(entry.chunkId);
      if (existing) {
        existing.rrf += inc;
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
 * Deduplicate by documentId — cap chunks per document.
 */
function diversifyByDocument(entries, maxPerDoc = MAX_PER_DOCUMENT) {
  const counts = new Map();
  const out = [];
  for (const e of entries) {
    const docId = e.documentId || '__unknown__';
    const c = counts.get(docId) || 0;
    if (c >= maxPerDoc) continue;
    counts.set(docId, c + 1);
    out.push(e);
  }
  return out;
}

/**
 * Main hybrid search entrypoint.
 */
async function search(user, query, options = {}) {
  if (!user.organizationId) return { query, results: [] };
  if (!query || !query.trim()) return { query, results: [] };

  const limit = Math.min(Number(options.limit) || 5, 20);
  const candidatesPerList = Math.min(limit * 3, 30);
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

  // 2. Vector + keyword per variant
  const searchTasks = [];
  for (const q of queries) {
    searchTasks.push(vectorSearch(user.organizationId, q, candidatesPerList, filters));
    searchTasks.push(keywordSearch(user.organizationId, q, candidatesPerList, filters));
  }

  const listResults = await Promise.allSettled(searchTasks);
  const rankedLists = listResults
    .filter(
      (r) =>
        r.status === 'fulfilled' &&
        Array.isArray(r.value) &&
        r.value.length > 0
    )
    .map((r) => r.value);

  if (rankedLists.length === 0) {
    return { query, expandedQueries: queries, results: [] };
  }

  // 3. RRF merge
  const merged = rrfMerge(rankedLists);

  // 4. Similarity threshold + diversity
  const filtered = merged.filter(
    (e) => e.vectorScore == null || e.vectorScore >= MIN_SIMILARITY
  );
  const diverse = diversifyByDocument(filtered, MAX_PER_DOCUMENT);

  // 5. LLM rerank top 15
  const rerankPool = diverse.slice(0, Math.min(15, diverse.length));
  const final = useRerank
    ? await rerank(query.trim(), rerankPool, { topK: limit })
    : diverse.slice(0, limit);

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
      // similarity is now a proper 0-1 range
      similarity:
        r.vectorScore != null
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