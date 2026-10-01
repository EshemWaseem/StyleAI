// services/matching/aiClient.js
// ======================================================
// Calls FastAPI /api/v1/match/influencers
// ======================================================

const { httpError } = require('../influencer/helpers');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;

async function callMatchApi({ product, candidates, timeoutMs = 300000 }) {
  if (!AI_INTERNAL_KEY) {
    throw httpError('AI service not configured', 500, 'AI_NOT_CONFIGURED');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/match/influencers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY,
      },
      body: JSON.stringify({ product, candidates }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw httpError(
        `AI service ${res.status}: ${text.slice(0, 200)}`,
        502,
        'AI_UPSTREAM_ERROR'
      );
    }

    return await res.json();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw httpError('AI service timeout', 504, 'AI_TIMEOUT');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callMatchApi };