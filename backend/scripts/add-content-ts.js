// scripts/add-content-ts.js
// ======================================================
// One-time migration: add generated tsvector column + GIN index
// to DocumentChunk for fast keyword search.
// Run: node scripts/add-content-ts.js
// ======================================================

require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
  console.log('▶ Adding content_ts column (if missing)…');

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "DocumentChunk"
      ADD COLUMN IF NOT EXISTS content_ts tsvector
      GENERATED ALWAYS AS (to_tsvector('english', content)) STORED
  `);
  console.log('✔ Column ready');

  console.log('▶ Creating GIN index (if missing)…');
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS documentchunk_content_ts_gin_idx
      ON "DocumentChunk" USING GIN (content_ts)
  `);
  console.log('✔ Index ready');

  // Verify
  const rows = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'DocumentChunk' AND column_name = 'content_ts'
  `);
  console.log('▶ Verify:', rows);

  const chunkCount = await prisma.documentChunk.count();
  console.log(`▶ Chunks in table: ${chunkCount}`);

  console.log('\n✅ Done. All existing chunks have tsvector values auto-generated.');
}

main()
  .catch((e) => {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });