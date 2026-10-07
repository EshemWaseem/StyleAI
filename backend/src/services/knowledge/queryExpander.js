// services/knowledge/queryExpander.js
// ======================================================
// Expand a query into 2 alternate phrasings via LLM.
// Cached for 10 minutes. Falls back to [original] on failure.
// ======================================================

const { llmText } = require('./llmClient');

const CACHE = new Map();
const TTL_MS = 10 * 60 * 1000;
const MAX_CACHE = 300;

function key(q) {
  return String(q).trim().toLowerCase().slice(0, 200);
}

function getCached(k) {
  const e = CACHE.get(k);
  if (!e) return null;
  if (Date.now() > e.expiresAt) { CACHE.delete(k); return null; }
  return e.value;
}

function setCached(k, v) {
  if (CACHE.size >= MAX_CACHE) {
    const first = CACHE.keys().next().value;
    CACHE.delete(first);
  }
  CACHE.set(k, { value: v, expiresAt: Date.now() + TTL_MS });
}

/**
 * Returns array of query variants (always includes the original).
 * @param {string} query
 * @returns {Promise<string[]>}
 */
async function expandQuery(query) {
  const original = String(query || '').trim();
  if (!original) return [];

  const k = key(original);
  const cached = getCached(k);
  if (cached) return cached;

  // Short queries — no expansion needed
  if (original.length < 12) {
    const fallback = [original];
    setCached(k, fallback);
    return fallback;
  }

  const prompt = `You are a search query expander for a fashion e-commerce knowledge base.

Generate 2 ALTERNATE phrasings of the user's query that would improve document retrieval. Use synonyms and related terms.

Return ONLY a JSON array of 2 strings. No explanation, no markdown.

User query: "${original}"

JSON array:`;

  try {
    const raw = await llmText(prompt, { temperature: 0.2, maxTokens: 200 });
    if (!raw) throw new Error('no LLM response');

    // Extract JSON array
    const match = raw.match(/\[[\s\S]*?\]/);
    if (!match) throw new Error('no JSON array in response');

    const parsed = JSON.parse(match[0]);
    if (!Array.isArray(parsed)) throw new Error('not an array');

    const variants = parsed
      .filter((s) => typeof s === 'string' && s.trim().length > 0)
      .map((s) => s.trim())
      .slice(0, 2);

    const result = [original, ...variants];
    setCached(k, result);
    return result;
  } catch (err) {
    console.warn('[queryExpander] failed:', err.message);
    const fallback = [original];
    setCached(k, fallback);
    return fallback;
  }
}

function invalidateAll() {
  CACHE.clear();
}

module.exports = { expandQuery, invalidateAll };