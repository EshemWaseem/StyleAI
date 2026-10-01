// services/knowledge/brandContext.js
// ======================================================
// Brand context retrieval for AI prompt injection.
// Caches per (orgId, queryHash) for 5 min.
// ======================================================

const { search } = require('./search');

const CACHE = new Map();
const TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_SIZE = 500;

function hashQuery(q) {
  return String(q).trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 200);
}

function cacheKey(orgId, query) {
  return `${orgId}:${hashQuery(query)}`;
}

function getCached(key) {
  const entry = CACHE.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return entry.value;
}

function setCached(key, value) {
  if (CACHE.size >= MAX_CACHE_SIZE) {
    const first = CACHE.keys().next().value;
    CACHE.delete(first);
  }
  CACHE.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

/**
 * Fetch brand context chunks relevant to a query.
 * @param {Object} user  — must have organizationId
 * @param {string} query — natural language task description
 * @param {Object} [options]
 * @param {number} [options.limit=4]       max chunks (hard cap 6)
 * @param {number} [options.minSimilarity=0.5]
 * @returns {Promise<{chunks, formatted, cached}>}
 */
async function getBrandContext(user, query, options = {}) {
  const empty = { chunks: [], formatted: '', cached: false };
  if (!user?.organizationId) return empty;
  if (!query || !String(query).trim()) return empty;

  const limit = Math.min(Number(options.limit) || 4, 6);
  const minSimilarity = options.minSimilarity ?? 0.5;

  const key = cacheKey(user.organizationId, query);
  const cached = getCached(key);
  if (cached) return { ...cached, cached: true };

  let chunks = [];
  try {
    const result = await search(user, String(query).trim(), { limit: limit * 2 });
    chunks = (result.results || [])
      .filter((r) => r.similarity >= minSimilarity)
      .slice(0, limit);
  } catch (err) {
    console.warn('[brandContext] search failed:', err.message);
    return empty;
  }

  const formatted = formatChunks(chunks);
  const value = { chunks, formatted };
  setCached(key, value);
  return { ...value, cached: false };
}

function formatChunks(chunks) {
  if (!chunks.length) return '';
  return chunks
    .map((c, i) => `[${i + 1}] (${c.documentName}): ${c.content}`)
    .join('\n\n');
}

/**
 * Build a compact query string from arbitrary key:value pairs.
 * Drops null/empty values, truncates to 200 chars.
 */
function buildQuery(parts = {}) {
  return Object.values(parts)
    .filter((v) => v != null && String(v).trim() !== '')
    .map((v) => String(v).trim())
    .join(' ')
    .slice(0, 200);
}

function invalidate(organizationId) {
  for (const key of CACHE.keys()) {
    if (key.startsWith(`${organizationId}:`)) CACHE.delete(key);
  }
}

function invalidateAll() {
  CACHE.clear();
}

module.exports = { getBrandContext, buildQuery, invalidate, invalidateAll };