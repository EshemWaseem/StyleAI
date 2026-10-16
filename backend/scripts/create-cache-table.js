// backend/scripts/create-cache-table.js
// One-time script — creates SocialScrapeCache table manually
// (skips db push because of existing tsvector generated column)

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SocialScrapeCache" (
        "id"         TEXT NOT NULL,
        "platform"   TEXT NOT NULL,
        "handle"     TEXT NOT NULL,
        "data"       JSONB NOT NULL,
        "found"      BOOLEAN NOT NULL DEFAULT true,
        "reason"     TEXT,
        "expiresAt"  TIMESTAMP(3) NOT NULL,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"  TIMESTAMP(3) NOT NULL,
        CONSTRAINT "SocialScrapeCache_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('✅ Table created');

    await prisma.$executeRawUnsafe(`
      CREATE UNIQUE INDEX IF NOT EXISTS "SocialScrapeCache_platform_handle_key"
      ON "SocialScrapeCache"("platform", "handle")
    `);
    console.log('✅ Unique index created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SocialScrapeCache_expiresAt_idx"
      ON "SocialScrapeCache"("expiresAt")
    `);
    console.log('✅ expiresAt index created');

    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "SocialScrapeCache_platform_idx"
      ON "SocialScrapeCache"("platform")
    `);
    console.log('✅ platform index created');

    const count = await prisma.socialScrapeCache.count();
    console.log('✅ Verify OK — rows:', count);
  } catch (e) {
    console.error('❌ Failed:', e.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();