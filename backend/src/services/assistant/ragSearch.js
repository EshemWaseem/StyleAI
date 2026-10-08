// services/assistant/ragSearch.js
// ======================================================
// RAG — find relevant brand chunks for the assistant.
// Delegates to the full hybrid search pipeline (vector + keyword + RRF + rerank).
// Also applies a final similarity floor + document diversity here, so the
// assistant gets clean, relevant context.
// ======================================================

const knowledge = require('../knowledge');

const DEFAULT_LIMIT = 6;
const MIN_SIMILARITY = 0.25;   // must match search.js
const MAX_PER_DOCUMENT = 2;    // must match search.js

/**
 * @param {string} organizationId
 * @param {string} query
 * @param {number} [limit]
 * @returns {Promise<Array<{
 *   chunkId, content, source, docType, similarity,
 *   _vector, _keyword, _rrf, _rerankRank
 * }>>}
 */
async function searchDocs(organizationId, query, limit = DEFAULT_LIMIT) {
  if (!organizationId) return [];
  if (!query || !query.trim()) return [];

  try {
    // Ask search pipeline for a few extra candidates, then trim locally
    const overshoot = Math.max(limit + 2, 8);

    const result = await knowledge.search(
      { organizationId },
      query.trim(),
      { limit: overshoot, expand: true, rerank: true }
    );

    const raw = (result.results || []).map((r) => ({
      chunkId: r.chunkId,
      content: r.content,
      source: r.documentName,
      docType: r.documentType,
      similarity: r.similarity,
      // debug/telemetry — kept for downstream logging
      _vector: r.vectorScore,
      _keyword: r.keywordScore,
      _rrf: r.rrf,
      _rerankRank: r.rerankRank,
    }));

    // Defensive: apply similarity floor + per-document cap
    const filtered = raw.filter(
      (r) => r.similarity == null || r.similarity >= MIN_SIMILARITY
    );

    const counts = new Map();
    const out = [];
    for (const r of filtered) {
      const key = r.source || '__unknown__';
      const c = counts.get(key) || 0;
      if (c >= MAX_PER_DOCUMENT) continue;
      counts.set(key, c + 1);
      out.push(r);
      if (out.length >= limit) break;
    }

    return out;
  } catch (err) {
    console.warn('[assistant.ragSearch] failed:', err.message);
    return [];
  }
}

module.exports = { searchDocs };