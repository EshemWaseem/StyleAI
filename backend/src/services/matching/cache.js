// services/matching/cache.js
// ======================================================
// In-memory matching cache (1-hour TTL)
// Key: productId :: sorted(candidateIds)
// ======================================================

const store = new Map();
const TTL_MS = 60 * 60 * 1000; // 1 hour

function makeKey(productId, candidateIds) {
  const sig = [...candidateIds].sort().join(",");
  return `${productId}::${sig}`;
}

function get(productId, candidateIds) {
  const k = makeKey(productId, candidateIds);
  const entry = store.get(k);
  if (!entry) return null;
  if (Date.now() - entry.at > TTL_MS) {
    store.delete(k);
    return null;
  }
  return entry.data;
}

function set(productId, candidateIds, data) {
  store.set(makeKey(productId, candidateIds), { at: Date.now(), data });
}

/** Remove all cache entries that contained this influencer. */
function invalidateInfluencer(influencerId) {
  let n = 0;
  for (const k of store.keys()) {
    const ids = k.split("::")[1]?.split(",") || [];
    if (ids.includes(influencerId)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

function invalidateProduct(productId) {
  let n = 0;
  for (const k of store.keys()) {
    if (k.startsWith(`${productId}::`)) {
      store.delete(k);
      n++;
    }
  }
  return n;
}

function stats() {
  return { size: store.size };
}

module.exports = { get, set, invalidateInfluencer, invalidateProduct, stats };