// services/knowledge/reranker.js
// ======================================================
// LLM-based reranking of candidate chunks.
// Takes top-N candidates, asks LLM to pick the best K.
// Falls back to input order on failure.
// ======================================================

const { llmText } = require('./llmClient');

/**
 * Rerank candidates by relevance to query.
 * @param {string} query
 * @param {Array} candidates - [{ chunkId, content, vectorScore, keywordScore, rrf, ... }]
 * @param {object} [opts]
 * @param {number} [opts.topK=5]
 * @returns {Promise<Array>}
 */
async function rerank(query, candidates, opts = {}) {
  const topK = Math.min(Number(opts.topK) || 5, candidates.length);
  if (candidates.length <= topK) return candidates;

  // Truncate each candidate for the prompt (avoid huge prompts)
  const snippets = candidates.map((c, i) => {
    const text = String(c.content || '').slice(0, 400).replace(/\s+/g, ' ');
    return `[${i}] ${text}`;
  });

  const prompt = `You are a search reranker for a fashion brand knowledge base.

User query: "${query}"

Below are ${candidates.length} candidate passages. Rank them by relevance to the query.

Return ONLY a JSON array of the top ${topK} indices, ordered from most to least relevant. Example: [3,0,7,2,5]

No explanation, no markdown, only the JSON array.

Candidates:
${snippets.join('\n')}

JSON array of top ${topK} indices:`;

  try {
    const raw = await llmText(prompt, { temperature: 0.0, maxTokens: 100 });
    if (!raw) throw new Error('no LLM response');

    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('no array');

    const indices = JSON.parse(match[0]);
    if (!Array.isArray(indices)) throw new Error('not array');

    const reranked = [];
    const seen = new Set();
    for (const idx of indices) {
      const n = Number(idx);
      if (!Number.isInteger(n) || n < 0 || n >= candidates.length) continue;
      if (seen.has(n)) continue;
      seen.add(n);
      reranked.push({ ...candidates[n], rerankRank: reranked.length + 1 });
    }

    // Fill remaining slots from original order (if LLM returned < topK)
    for (let i = 0; i < candidates.length && reranked.length < topK; i++) {
      if (!seen.has(i)) {
        reranked.push({ ...candidates[i], rerankRank: reranked.length + 1 });
        seen.add(i);
      }
    }

    return reranked.slice(0, topK);
  } catch (err) {
    console.warn('[reranker] failed, using input order:', err.message);
    return candidates.slice(0, topK);
  }
}

module.exports = { rerank };