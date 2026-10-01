// services/knowledge/embedder.js
// ======================================================
// Node → FastAPI embeddings client
// ======================================================

const { httpError } = require('../influencer/helpers');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;

async function embedTexts(texts) {
  if (!Array.isArray(texts) || texts.length === 0) return [];

  const res = await fetch(`${AI_SERVICE_URL}/api/v1/embeddings/embed`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": AI_INTERNAL_KEY,
    },
    body: JSON.stringify({ texts }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw httpError(`Embedding failed: ${res.status} ${text.slice(0, 200)}`, 502);
  }

  const data = await res.json();
  return data.embeddings;
}

module.exports = { embedTexts };