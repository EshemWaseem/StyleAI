// scripts/check-chunks.js
require('dotenv').config();
const prisma = require('../src/config/prisma');

async function main() {
  const docs = await prisma.document.findMany({
    include: { chunks: { orderBy: { chunkIndex: 'asc' } } },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  for (const d of docs) {
    console.log('\n========================================');
    console.log(`Document: "${d.name}"`);
    console.log(`Status: ${d.status} | Chunks: ${d.chunks.length}`);
    console.log('========================================');

    for (const c of d.chunks) {
      console.log(`\n--- Chunk [${c.chunkIndex}] ---`);
      console.log(`Length: ${c.content.length} chars`);
      console.log(`Tokens: ${c.tokens}`);
      console.log(`Content START: "${c.content.slice(0, 100)}"`);
      console.log(`Content END:   "...${c.content.slice(-100)}"`);
      console.log(`\nFULL CONTENT:\n${c.content}\n`);
    }
  }
}

main()
  .catch((e) => console.error(e))
  .finally(() => prisma.$disconnect());