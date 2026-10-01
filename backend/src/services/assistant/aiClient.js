// services/assistant/aiClient.js
// ======================================================
// Call FastAPI /api/v1/chat/text (raw text completion)
// ======================================================

const { httpError } = require('../influencer/helpers');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;
const DEFAULT_TIMEOUT_MS = 180000;

async function callChatText(prompt, options = {}) {
  if (!AI_INTERNAL_KEY) throw httpError('AI not configured', 500, 'AI_NOT_CONFIGURED');

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    options.timeoutMs || DEFAULT_TIMEOUT_MS
  );

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/chat/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY,
      },
      body: JSON.stringify({
        prompt,
        temperature: options.temperature ?? 0.5,
        num_predict: options.numPredict ?? 800,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`AI ${res.status}: ${text.slice(0, 200)}`);
    }

    const data = await res.json();
    return data?.text || '';
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('AI timeout');
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { callChatText };