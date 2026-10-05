// services/ai/pricing.js
// ======================================================
// Known model pricing — USD per 1K tokens (or per call)
// Used to estimate cost when providers don't return it.
// ======================================================

const PRICING = {
  // ---- Ollama (local, free) ----
  'ollama:qwen2.5:7b':             { inputPer1k: 0, outputPer1k: 0 },
  'ollama:qwen2.5:14b':            { inputPer1k: 0, outputPer1k: 0 },
  'ollama:llama3.1:8b':            { inputPer1k: 0, outputPer1k: 0 },

  // ---- Gemini ----
  'gemini:gemini-flash-latest':    { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini:gemini-1.5-flash':       { inputPer1k: 0.000075, outputPer1k: 0.0003 },
  'gemini:gemini-1.5-pro':         { inputPer1k: 0.00125,  outputPer1k: 0.005 },
  'gemini:gemini-embedding-001':   { inputPer1k: 0.000025, outputPer1k: 0 },

  // ---- Groq (free tier) ----
  'groq:llama-3.3-70b-versatile':  { inputPer1k: 0, outputPer1k: 0 },
  'groq:llama-3.1-8b-instant':     { inputPer1k: 0, outputPer1k: 0 },

  // ---- HuggingFace (per call) ----
  'huggingface:black-forest-labs/FLUX.1-Kontext-dev': { perCall: 0.01 },
  'huggingface:black-forest-labs/FLUX.1-schnell':     { perCall: 0.003 },
};

/**
 * Look up pricing for a provider + model.
 * Falls back to { inputPer1k: 0, outputPer1k: 0, perCall: 0 } if unknown.
 */
function getPricing(provider, modelName) {
  if (!provider) return { inputPer1k: 0, outputPer1k: 0, perCall: 0 };
  const key = `${provider}:${modelName}`;
  if (PRICING[key]) return PRICING[key];

  // Try without version suffix
  const modelBase = String(modelName || '').split('/').pop();
  const altKey = Object.keys(PRICING).find((k) =>
    k.toLowerCase().includes(modelBase.toLowerCase())
  );
  if (altKey) return PRICING[altKey];

  return { inputPer1k: 0, outputPer1k: 0, perCall: 0 };
}

/**
 * Estimate cost in USD.
 */
function estimateCost({ provider, modelName, inputTokens = 0, outputTokens = 0, calls = 1 }) {
  const p = getPricing(provider, modelName);
  const inputCost = (inputTokens / 1000) * (p.inputPer1k || 0);
  const outputCost = (outputTokens / 1000) * (p.outputPer1k || 0);
  const callCost = calls * (p.perCall || 0);
  return Number((inputCost + outputCost + callCost).toFixed(6));
}

/**
 * Rough token estimate from text — 4 chars per token.
 */
function estimateTokens(text) {
  if (!text) return 0;
  const str = typeof text === 'string' ? text : JSON.stringify(text);
  return Math.max(0, Math.ceil(str.length / 4));
}

module.exports = { PRICING, getPricing, estimateCost, estimateTokens };