// services/assistant/promptBuilder.js
// ======================================================
// Build the full LLM prompt: system + RAG + memory + user
// Better citations — numbered + source + docType.
// ======================================================

const MAX_HISTORY = 10;

function buildPrompt({ text, docChunks, recentMessages }) {
  const docBlock = docChunks.length
    ? docChunks
        .map((c, i) => {
          const type = c.docType ? ` · ${c.docType}` : '';
          const sim = c.similarity != null
            ? ` · relevance ${Math.round(c.similarity * 100)}%`
            : '';
          return `[${i + 1}] (${c.source}${type}${sim})\n${c.content}`;
        })
        .join('\n\n')
    : '(no brand documents uploaded yet)';

  const historyBlock = recentMessages.length
    ? recentMessages
        .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')
    : '(this is the first message)';

  return `You are StyleAI, a helpful fashion e-commerce assistant.

RULES - follow all of them strictly:
1. Be concise. Reply in 2 to 6 sentences, or a short numbered list.
2. Never repeat a word twice in a row.
3. Never invent facts about the brand.
4. Do not mention "chunks", "context", "documents", or "brand knowledge".
5. Do not use markdown headings, bold titles, or code fences.
6. If greeted, reply briefly and ask how you can help.
7. When citing brand knowledge, use the numbered form [1], [2] etc. inline.
8. If a fact is not in the brand knowledge and you are unsure, say so plainly.
9. Stop cleanly after your answer.

BRAND KNOWLEDGE (use only if relevant; cite as [1], [2]):
${docBlock}

RECENT CONVERSATION:
${historyBlock}

User: ${text}
Assistant:`;
}

function getRecentMessages(conv) {
  return (conv.messages || []).slice(-MAX_HISTORY);
}

module.exports = { buildPrompt, getRecentMessages, MAX_HISTORY };