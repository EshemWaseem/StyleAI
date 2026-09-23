/**
 * One-time backfill:
 * Create default BrandTeamRole rows for every existing brand.
 *
 * Run: node src/scripts/backfillBrandRoles.js
 */
require('dotenv').config();
const prisma = require('../config/prisma');
const { ensureDefaultRoles } = require('../services/brandTeamRoleService');

async function main() {
  console.log('🔍 Fetching all brands...');

  const brands = await prisma.brand.findMany({
    select: { id: true, name: true },
  });

  console.log(`   Found ${brands.length} brand(s).\n`);

  let created = 0;
  let skipped = 0;

  for (const brand of brands) {
    const beforeCount = await prisma.brandTeamRole.count({
      where: { brandId: brand.id },
    });

    await ensureDefaultRoles(brand.id);

    const afterCount = await prisma.brandTeamRole.count({
      where: { brandId: brand.id },
    });

    if (afterCount > beforeCount) {
      created += afterCount - beforeCount;
      console.log(`✅ ${brand.name}: created ${afterCount - beforeCount} role(s)`);
    } else {
      skipped++;
      console.log(`⏭  ${brand.name}: already has ${afterCount} role(s)`);
    }
  }

  console.log('\n📊 Summary:');
  console.log(`   Total brands: ${brands.length}`);
  console.log(`   Roles created: ${created}`);
  console.log(`   Skipped: ${skipped}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('❌ Backfill failed:', err);
  process.exit(1);
});