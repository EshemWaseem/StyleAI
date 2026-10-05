// backend/src/scripts/seedAIModels.js
// One-time seed of known models.
// Run: node src/scripts/seedAIModels.js
require('dotenv').config();
const prisma = require('../config/prisma');

const MODELS = [
  // ---- Text (default) ----
  {
    name: 'qwen2.5:7b', displayName: 'Qwen 2.5 7B', provider: 'ollama',
    taskType: 'text', version: '1.0', status: 'PRODUCTION', isDefault: true,
    costPer1kInput: 0, costPer1kOutput: 0,
    evaluationNotes: 'Local free tier — used for product content, platform content',
  },
  // ---- Vision ----
  {
    name: 'gemini-flash-latest', displayName: 'Gemini Flash (Vision)', provider: 'gemini',
    taskType: 'vision', version: '1.0', status: 'PRODUCTION', isDefault: true,
    costPer1kInput: 0.000075, costPer1kOutput: 0.0003,
    evaluationNotes: 'Used for product analysis + image QA',
  },
  // ---- Embeddings ----
  {
    name: 'gemini-embedding-001', displayName: 'Gemini Embedding', provider: 'gemini',
    taskType: 'embedding', version: '1.0', status: 'PRODUCTION', isDefault: true,
    costPer1kInput: 0.000025,
    evaluationNotes: '768-dim, used for RAG (pgvector)',
  },
  // ---- Image gen ----
  {
    name: 'black-forest-labs/FLUX.1-Kontext-dev', displayName: 'FLUX.1 Kontext', provider: 'huggingface',
    taskType: 'image', version: '1.0', status: 'PRODUCTION', isDefault: true,
    costPerCall: 0.01,
    evaluationNotes: 'Text-to-image (no product preservation) — paid tier needed for quality',
  },
  // ---- Text fallback (Groq) ----
  {
    name: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B', provider: 'groq',
    taskType: 'text', version: '1.0', status: 'STAGING',
    costPer1kInput: 0, costPer1kOutput: 0,
    evaluationNotes: 'Free tier alternative — better JSON reliability than qwen2.5:7b',
  },
];

async function main() {
  console.log('🌱 Seeding AI models...\n');
  let created = 0, skipped = 0;

  for (const m of MODELS) {
    const existing = await prisma.aIModel.findFirst({
      where: { name: m.name, provider: m.provider, version: m.version },
    });
    if (existing) {
      skipped++;
      console.log(`⏭  ${m.displayName} (already exists)`);
      continue;
    }
    await prisma.aIModel.create({ data: m });
    created++;
    console.log(`✅ ${m.displayName}`);
  }

  console.log(`\n📊 Created: ${created}, Skipped: ${skipped}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });