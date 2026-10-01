// services/knowledge/ingest.js
// ======================================================
// Ingest: document → chunk → embed → store
// Uses raw SQL for vector insert (Prisma can't write Unsupported)
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { chunkText, countTokensApprox } = require('./chunker');
const { embedTexts } = require('./embedder');
const brandContext = require('./brandContext');
/**
 * Convert a number array into the pgvector literal '[1,2,3]'
 */
function toVectorLiteral(arr) {
  return `[${arr.map((x) => Number(x)).join(",")}]`;
}

async function createDocument(user, payload = {}) {
  if (!user.organizationId) throw httpError('No organization linked', 403, 'NO_ORG');

  const { name, type = "other", content, mimeType = null, sizeBytes = 0, storageUrl = null } = payload;

  if (!name || !name.trim()) throw httpError('name is required', 400, 'INVALID_NAME');
  if (!content || !content.trim()) throw httpError('content is required', 400, 'INVALID_CONTENT');

  const doc = await prisma.document.create({
    data: {
      organizationId: user.organizationId,
      name: name.trim(),
      type,
      mimeType,
      sizeBytes: sizeBytes || content.length,
      storageUrl,
      status: "INDEXING",
      uploadedBy: user.id,
    },
  });

  // Fire indexing in background (fire-and-forget but awaited for small text)
  try {
    await indexDocument(doc.id, content);
  } catch (err) {
    await prisma.document.update({
      where: { id: doc.id },
      data: { status: "FAILED", error: err.message?.slice(0, 500) },
    });
    throw err;
  }

  brandContext.invalidate(user.organizationId);


  return getDocument(user, doc.id);
}

async function indexDocument(documentId, content) {
  const chunks = chunkText(content);
  if (chunks.length === 0) {
    throw new Error("Document produced no chunks");
  }

  // Embed in batches of 20
  const BATCH = 20;
  const allEmbeddings = [];
  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const embeds = await embedTexts(batch);
    allEmbeddings.push(...embeds);
  }

  if (allEmbeddings.length !== chunks.length) {
    throw new Error("Embedding count mismatch");
  }

  // Insert chunks with vectors via raw SQL (Prisma Unsupported workaround)
  await prisma.$transaction(async (tx) => {
    // Clear old chunks first
    await tx.documentChunk.deleteMany({ where: { documentId } });

    for (let i = 0; i < chunks.length; i++) {
      const content = chunks[i];
      const embedding = allEmbeddings[i];
      const tokens = countTokensApprox(content);
      const vector = toVectorLiteral(embedding);

      await tx.$executeRawUnsafe(
        `INSERT INTO "DocumentChunk" (id, "documentId", "chunkIndex", content, tokens, embedding, "createdAt")
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5::vector, NOW())`,
        documentId,
        i,
        content,
        tokens,
        vector
      );
    }

    await tx.document.update({
      where: { id: documentId },
      data: {
        status: "INDEXED",
        chunkCount: chunks.length,
        error: null,
      },
    });
  });

  return { chunkCount: chunks.length };
}

async function reindexDocument(user, documentId) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw httpError('Document not found', 404, 'NOT_FOUND');
  if (doc.organizationId !== user.organizationId && !user.roles?.includes('SUPER_ADMIN')) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }

  // Reconstruct text from current chunks (best-effort)
  const chunks = await prisma.documentChunk.findMany({
    where: { documentId },
    orderBy: { chunkIndex: "asc" },
  });
  const text = chunks.map((c) => c.content).join("\n\n");

  if (!text.trim()) throw httpError('No content to reindex', 400, 'EMPTY');

  await prisma.document.update({
    where: { id: documentId },
    data: { status: "INDEXING" },
  });

  brandContext.invalidate(user.organizationId);

  return indexDocument(documentId, text);
}

async function deleteDocument(user, documentId) {
  const doc = await prisma.document.findUnique({ where: { id: documentId } });
  if (!doc) throw httpError('Document not found', 404, 'NOT_FOUND');
  if (doc.organizationId !== user.organizationId && !user.roles?.includes('SUPER_ADMIN')) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }
  await prisma.document.delete({ where: { id: documentId } });
  brandContext.invalidate(user.organizationId);
  return { id: documentId };
}

async function getDocument(user, documentId) {
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    include: { _count: { select: { chunks: true } } },
  });
  if (!doc) throw httpError('Document not found', 404, 'NOT_FOUND');
  if (doc.organizationId !== user.organizationId && !user.roles?.includes('SUPER_ADMIN')) {
    throw httpError('Forbidden', 403, 'FORBIDDEN');
  }
  return shapeDocument(doc);
}

function shapeDocument(d) {
  return {
    id: d.id,
    name: d.name,
    type: d.type,
    mimeType: d.mimeType,
    sizeBytes: d.sizeBytes,
    storageUrl: d.storageUrl,
    status: d.status,
    error: d.error,
    chunkCount: d._count?.chunks ?? d.chunkCount ?? 0,
    uploadedBy: d.uploadedBy,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
  };
}

module.exports = {
  createDocument,
  reindexDocument,
  deleteDocument,
  getDocument,
  shapeDocument,
  indexDocument,
};