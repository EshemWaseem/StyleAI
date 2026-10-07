// services/knowledge/llmClient.js
// ======================================================
// Thin client to AI service's Ollama chat endpoint.
// Used by reranker + queryExpander.
// Never throws — returns null on failure.
// ======================================================

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;
const TIMEOUT_MS = 15000;

/**
 * Call the AI service's text chat endpoint.
 * @param {string} prompt
 * @param {object} [options] - { temperature, maxTokens, systemPrompt }
 * @returns {Promise<string|null>}
 */
async function llmText(prompt, options = {}) {
  if (!prompt || !String(prompt).trim()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY,
      },
      body: JSON.stringify({
        prompt: String(prompt),
        temperature: options.temperature ?? 0.0,
        max_tokens: options.maxTokens ?? 512,
        system_prompt: options.systemPrompt || undefined,
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      console.warn(`[llmClient] HTTP ${res.status}`);
      return null;
    }

    const data = await res.json();
    // AI service can return { response } | { text } | { content } | { message }
    return (
      data?.response ??
      data?.text ??
      data?.content ??
      data?.message ??
      null
    );
  } catch (err) {
    console.warn('[llmClient] failed:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { llmText };