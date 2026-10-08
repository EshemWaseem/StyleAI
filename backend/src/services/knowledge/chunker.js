// services/knowledge/chunker.js
// ======================================================
// Paragraph-aware, sentence-aligned chunker.
// Target: 400-500 chars per chunk.
// Normalizes weird whitespace (from PDFs etc).
// ======================================================

const TARGET_CHARS = 450;
const MAX_CHARS = 700;
const OVERLAP_CHARS = 100;
const MIN_CHUNK_CHARS = 40;

// Normalize any whitespace (spaces, tabs, newlines) → single space
function normalizeSpaces(s) {
  return String(s || '').replace(/\s+/g, ' ').trim();
}

function splitSentences(text) {
  if (!text) return [];
  const ABBREV =
    /\b(?:Mr|Mrs|Ms|Dr|Jr|Sr|vs|etc|i\.e|e\.g|Inc|Ltd|Co|St|Ave|Rd|Blvd|No|Fig)\.$/i;

  const raw = text.split(/(?<=[.!?])\s+(?=[A-Z"'(])/g);
  const sentences = [];
  let buf = '';
  for (const piece of raw) {
    buf = buf ? `${buf} ${piece}` : piece;
    if (!ABBREV.test(buf.trim())) {
      sentences.push(normalizeSpaces(buf));
      buf = '';
    }
  }
  if (buf.trim()) sentences.push(normalizeSpaces(buf));
  return sentences.filter(Boolean);
}

function forceSplitByWords(sentence, maxChars) {
  const words = sentence.split(/\s+/);
  const out = [];
  let buf = '';
  for (const w of words) {
    if ((buf + ' ' + w).length > maxChars && buf) {
      out.push(buf.trim());
      buf = w;
    } else {
      buf = buf ? `${buf} ${w}` : w;
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

function chunkText(text) {
  if (!text || typeof text !== 'string') return [];

  // Normalize line endings
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (clean.length === 0) return [];

  // Split on paragraph boundaries (blank lines)
  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Flatten to sentences, tracking paragraph ends
  const sentences = [];
  for (let pi = 0; pi < paragraphs.length; pi++) {
    const paraSentences = splitSentences(paragraphs[pi]);
    for (let si = 0; si < paraSentences.length; si++) {
      sentences.push({
        text: paraSentences[si],
        paraEnd: si === paraSentences.length - 1,
      });
    }
  }

  if (sentences.length === 0) return [];
  if (clean.length < MIN_CHUNK_CHARS * 2) return [normalizeSpaces(clean)];

  const chunks = [];
  let current = '';
  let overlapTail = '';

  const flush = () => {
    const trimmed = normalizeSpaces(current);
    if (trimmed) chunks.push(trimmed);

    // Overlap tail: last sentence of just-flushed chunk
    if (trimmed.length > OVERLAP_CHARS) {
      const sentencesInCurrent = splitSentences(trimmed);
      overlapTail =
        sentencesInCurrent.length > 1
          ? sentencesInCurrent[sentencesInCurrent.length - 1]
          : '';
    } else {
      overlapTail = '';
    }
    current = '';
  };

  for (const s of sentences) {
    const sentence = s.text;

    // Oversized single sentence → force-split
    if (sentence.length > MAX_CHARS) {
      flush();
      const pieces = forceSplitByWords(sentence, TARGET_CHARS);
      for (let i = 0; i < pieces.length; i++) {
        const piece = pieces[i];
        const withOverlap =
          i > 0 && overlapTail ? `${overlapTail} ${piece}` : piece;
        chunks.push(normalizeSpaces(withOverlap));
        overlapTail = piece;
      }
      continue;
    }

    const candidate = current
      ? `${current} ${sentence}`
      : overlapTail
      ? `${overlapTail} ${sentence}`
      : sentence;

    const wouldExceed = candidate.length > MAX_CHARS;
    const paraBoundaryHit = s.paraEnd && current.length >= TARGET_CHARS;

    if ((wouldExceed || paraBoundaryHit) && current) {
      flush();
      current = overlapTail ? `${overlapTail} ${sentence}` : sentence;
    } else {
      current = candidate;
    }
  }

  if (current.trim()) {
    chunks.push(normalizeSpaces(current));
  }

  return chunks.filter((c) => c.length >= MIN_CHUNK_CHARS);
}

function countTokensApprox(text) {
  return Math.ceil((text || '').length / 4);
}

module.exports = { chunkText, countTokensApprox };