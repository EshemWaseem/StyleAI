// services/assistant/ragSearch.js
// ======================================================
// RAG — find relevant brand chunks for the assistant.
// Now uses the advanced hybrid search pipeline.
// ======================================================

const knowledge = require('../knowledge');

const DEFAULT_LIMIT = 4;

async function searchDocs(organizationId, query, limit = DEFAULT_LIMIT) {
  if (!organizationId) return [];
  if (!query || !query.trim()) return [];

  try {
    // Reuse the full hybrid search pipeline
    const result = await knowledge.search(
      { organizationId },
      query.trim(),
      { limit, expand: true, rerank: true }
    );

    return (result.results || []).map((r) => ({
      chunkId: r.chunkId,
      content: r.content,
      source: r.documentName,
      docType: r.documentType,
      similarity: r.similarity,
      // extra fields for debug/telemetry
      _vector: r.vectorScore,
      _keyword: r.keywordScore,
      _rrf: r.rrf,
      _rerankRank: r.rerankRank,
    }));
  } catch (err) {
    console.warn('[assistant.ragSearch] failed:', err.message);
    return [];
  }
}

module.exports = { searchDocs };