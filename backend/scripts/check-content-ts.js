// scripts/check-content-ts.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const rows = await prisma.$queryRaw`
      SELECT
        column_name,
        is_generated,
        generation_expression
      FROM information_schema.columns
      WHERE table_name = 'DocumentChunk'
        AND column_name = 'content_ts'
    `;
    console.log('Result:');
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
})();