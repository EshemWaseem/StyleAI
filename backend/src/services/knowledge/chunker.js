// services/knowledge/chunker.js
// ======================================================
// Simple paragraph-aware chunker (no external deps)
// ======================================================

const MAX_CHARS = 1200;
const OVERLAP_CHARS = 150;

function chunkText(text) {
  if (!text || typeof text !== "string") return [];
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (clean.length === 0) return [];

  // Split by double newlines (paragraphs)
  const paragraphs = clean.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);

  const chunks = [];
  let buf = "";

  const flush = () => {
    if (buf.trim()) chunks.push(buf.trim());
    buf = "";
  };

  for (const p of paragraphs) {
    if (p.length > MAX_CHARS) {
      // Split very long paragraph into sentence-ish windows
      flush();
      let start = 0;
      while (start < p.length) {
        const end = Math.min(start + MAX_CHARS, p.length);
        chunks.push(p.slice(start, end).trim());
        start = end - OVERLAP_CHARS;
        if (start < 0) start = 0;
        if (end === p.length) break;
      }
      continue;
    }

    if ((buf + "\n\n" + p).length > MAX_CHARS) {
      flush();
      buf = p;
    } else {
      buf = buf ? `${buf}\n\n${p}` : p;
    }
  }
  flush();

  return chunks.filter((c) => c.length > 20);
}

function countTokensApprox(text) {
  return Math.ceil((text || "").length / 4);
}

module.exports = { chunkText, countTokensApprox };