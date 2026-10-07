// backend/scripts/addTsvectorIndex.js
// One-time: add GIN index for full-text search on DocumentChunk.content
// Run: node scripts/addTsvectorIndex.js
require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
  console.log('🔍 Adding full-text search GIN index...');

  try {
    // Enable pg_trgm for fuzzy keyword matching (best-effort)
    try {
      await prisma.$executeRawUnsafe(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`);
      console.log('✅ pg_trgm extension ready');
    } catch (e) {
      console.warn('⚠️  pg_trgm not available (non-fatal):', e.message);
    }

    // GIN index on tsvector of content
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "DocumentChunk_content_fts_idx"
      ON "DocumentChunk"
      USING GIN (to_tsvector('english', content));
    `);
    console.log('✅ GIN index created: DocumentChunk_content_fts_idx');

    // Optional: trigram index for fuzzy search
    try {
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS "DocumentChunk_content_trgm_idx"
        ON "DocumentChunk"
        USING GIN (content gin_trgm_ops);
      `);
      console.log('✅ Trigram index created: DocumentChunk_content_trgm_idx');
    } catch (e) {
      console.warn('⚠️  Trigram index skipped:', e.message);
    }

    console.log('\n🎉 Done.');
  } catch (err) {
    console.error('❌ Failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();