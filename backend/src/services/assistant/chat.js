// services/assistant/chat.js
// ======================================================
// Main assistant chat — orchestrates RAG + memory + LLM + persistence
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { getOrCreateConversation } = require('./helpers');
const { searchDocs } = require('./ragSearch');
const { buildPrompt, getRecentMessages } = require('./promptBuilder');
const { callChatText } = require('./aiClient');

// ------------------------------------------------------
// Sanitizer — fixes common small-model glitches
// ------------------------------------------------------
function sanitizeReply(text) {
  if (!text) return '';
  let out = text;

  // Remove double-space duplicates: "multiple multiple" → "multiple"
  out = out.replace(/\b(\w+)\s+\1\b/gi, '$1');

  // Fix "11." → "1." (leading 1 duplication on numbered lists)
  out = out.replace(/^(\s*)1(\d)\.\s/gm, '$1$2. ');

  // Fix garbled markdown: ")**:**" → "**"
  out = out.replace(/\*\*\)\*\*:/g, '**');
  out = out.replace(/\*\*\)/g, '');

  // Strip markdown headings & code fences
  out = out.replace(/^#{1,6}\s+/gm, '');
  out = out.replace(/```[a-z]*\n?/gi, '');

  // If response contains "User:" or "Assistant:" mid-text → cut
  out = out.split(/\n\s*User:/i)[0];
  out = out.split(/\n\s*Assistant:/i)[0];

  // Collapse 3+ blank lines to 2
  out = out.replace(/\n{3,}/g, '\n\n');

  return out.trim();
}

async function chat(user, payload = {}) {
  const { message, conversationId } = payload;
  const text = (message || '').trim();

  if (!text) throw httpError('message is required', 400, 'EMPTY_MESSAGE');
  if (text.length > 2000) throw httpError('message too long (max 2000)', 400, 'TOO_LONG');

  // 1. Get conversation (existing or new)
  const conv = await getOrCreateConversation(user, conversationId);

  // 2. RAG — brand docs (silently degrades if embeddings unavailable)
  let docChunks = [];
  try {
    docChunks = await searchDocs(user.organizationId, text);
  } catch (err) {
    console.warn('[assistant.chat] RAG search failed:', err.message);
    docChunks = [];
  }

  // 3. Recent messages (memory)
  const recentMessages = getRecentMessages(conv);

  // 4. Build prompt
  const prompt = buildPrompt({ text, docChunks, recentMessages });

  // 5. Call AI — lower temp for determinism
  let reply = '';
  try {
    reply = await callChatText(prompt, { temperature: 0.3, numPredict: 600 });
    reply = sanitizeReply(reply);
    if (!reply.trim()) throw new Error('Empty reply');
  } catch (err) {
    console.error('[assistant.chat] AI call failed:', err.message);
    reply = "I couldn't reach the AI service right now. Please try again.";
  }

  // 6. Persist
  await prisma.$transaction([
    prisma.assistantMessage.create({
      data: {
        conversationId: conv.id,
        role: 'user',
        content: text,
        contextChunks: docChunks.length ? docChunks : null,
      },
    }),
    prisma.assistantMessage.create({
      data: {
        conversationId: conv.id,
        role: 'assistant',
        content: reply,
      },
    }),
    prisma.assistantConversation.update({
      where: { id: conv.id },
      data: {
        lastMessageAt: new Date(),
        title: conv.title || text.slice(0, 60),
      },
    }),
  ]);

  return {
    conversationId: conv.id,
    reply,
    sources: docChunks.map((c) => ({
      source: c.source,
      similarity: c.similarity,
    })),
  };
}

module.exports = { chat };