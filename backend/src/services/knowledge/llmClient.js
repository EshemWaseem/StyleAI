// services/knowledge/llmClient.js
// ======================================================
// Node → FastAPI text-completion client.
// Fixes:
//   - Correct endpoint: /api/v1/chat/text
//   - Correct field: num_predict (not max_tokens)
//   - Emulated system prompt (AI service has no system prompt)
//   - Enforced output truncation as safety net
// ======================================================

const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const AI_INTERNAL_KEY = process.env.AI_INTERNAL_KEY;
const TIMEOUT_MS = 20_000;
const DEFAULT_MAX_TOKENS = 400;

/**
 * Call the AI service's raw-text chat endpoint.
 *
 * @param {string} prompt
 * @param {object} [options]
 *   - temperature  {number}  default 0.0
 *   - maxTokens    {number}  default 400 (maps to num_predict)
 *   - systemPrompt {string}  prepended to prompt (AI service has no native support)
 *   - maxChars     {number}  hard truncate output length (safety net)
 * @returns {Promise<string|null>}
 */
async function llmText(prompt, options = {}) {
  if (!prompt || !String(prompt).trim()) return null;

  // The AI service has no system-prompt field — prepend it.
  const finalPrompt = options.systemPrompt
    ? `${options.systemPrompt}\n\n${String(prompt)}`
    : String(prompt);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_SERVICE_URL}/api/v1/chat/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Internal-Key': AI_INTERNAL_KEY,
      },
      body: JSON.stringify({
        prompt: finalPrompt,
        temperature: options.temperature ?? 0.0,
        num_predict: Math.min(
          Number(options.maxTokens) || DEFAULT_MAX_TOKENS,
          2000
        ),
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      console.warn(
        `[llmClient] HTTP ${res.status} — ${body.slice(0, 200)}`
      );
      return null;
    }

    const data = await res.json();

    // AI service returns { text, provider, model }
    let text =
      data?.text ??
      data?.response ??
      data?.content ??
      data?.message ??
      null;

    if (!text) return null;

    // Optional hard truncate (safety net for runaway LLMs)
    if (options.maxChars && text.length > options.maxChars) {
      text = text.slice(0, options.maxChars).trim() + '…';
    }

    return text;
  } catch (err) {
    console.warn('[llmClient] failed:', err.message);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

module.exports = { llmText };