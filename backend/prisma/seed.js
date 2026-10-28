// backend/prisma/seed.js
// Main seed — ONLY roles + permissions. Deterministic, no secrets.
// Safe to commit and run multiple times (idempotent via upsert).

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (roles + permissions)...');

  // ═══════════════════════════════════════════════════════
  // 1. Create all 6 roles
  // ═══════════════════════════════════════════════════════
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Platform super admin' },
    { name: 'BRAND_OWNER', description: 'Owns an organization/brand' },
    { name: 'BRAND_TEAM_MEMBER', description: 'Team member of a brand' },
    { name: 'INFLUENCER', description: 'Content creator / influencer' },
    { name: 'AGENCY', description: 'Manages multiple brands' },
    { name: 'SHOPPER', description: 'Retail customer / end shopper' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log(`  ✅ ${roles.length} roles ensured`);

  // ═══════════════════════════════════════════════════════
  // 2. Create permissions
  // ═══════════════════════════════════════════════════════
  const permissions = [
    // User management
    { name: 'user.create' },
    { name: 'user.read' },
    { name: 'user.update' },
    { name: 'user.delete' },
    // Organization
    { name: 'organization.create' },
    { name: 'organization.read' },
    { name: 'organization.update' },
    { name: 'organization.delete' },
    // Brand
    { name: 'brand.create' },
    { name: 'brand.read' },
    { name: 'brand.update' },
    { name: 'brand.delete' },
    // Product
    { name: 'product.create' },
    { name: 'product.read' },
    { name: 'product.update' },
    { name: 'product.delete' },
    // Team
    { name: 'team.create' },
    { name: 'team.read' },
    { name: 'team.update' },
    { name: 'team.delete' },
    // Billing
    { name: 'billing.read' },
    { name: 'billing.manage' },
    // Commerce — shopper-focused
    { name: 'product.browse' },
    { name: 'cart.manage' },
    { name: 'order.create' },
    { name: 'order.read' },
    { name: 'profile.update' },
    // Agency
    { name: 'agency.read' },
    { name: 'agency.create' },
    { name: 'agency.update' },
    { name: 'agency.delete' },
    // Influencer
    { name: 'influencer.read' },
    { name: 'influencer.create' },
    { name: 'influencer.update' },
    { name: 'influencer.delete' },
    { name: 'influencer.save' },
    { name: 'influencer.contact' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`  ✅ ${permissions.length} permissions ensured`);

  // ═══════════════════════════════════════════════════════
  // 3. Assign permissions to roles
  // ═══════════════════════════════════════════════════════
  const [
    superAdminRole,
    brandOwnerRole,
    teamMemberRole,
    influencerRole,
    shopperRole,
    agencyRole,
  ] = await Promise.all([
    prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } }),
    prisma.role.findUnique({ where: { name: 'BRAND_OWNER' } }),
    prisma.role.findUnique({ where: { name: 'BRAND_TEAM_MEMBER' } }),
    prisma.role.findUnique({ where: { name: 'INFLUENCER' } }),
    prisma.role.findUnique({ where: { name: 'SHOPPER' } }),
    prisma.role.findUnique({ where: { name: 'AGENCY' } }),
  ]);

  const allPermissions = await prisma.permission.findMany();

  // ─── SUPER_ADMIN: all permissions ───
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: superAdminRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ SUPER_ADMIN: ${allPermissions.length} permissions`);

  // ─── BRAND_OWNER: brand, product, team, billing, organization, influencer ───
  const ownerPermissions = allPermissions.filter((p) =>
    ['brand', 'product', 'team', 'billing', 'organization', 'influencer'].some(
      (prefix) => p.name.startsWith(prefix)
    )
  );
  for (const perm of ownerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: brandOwnerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: brandOwnerRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ BRAND_OWNER: ${ownerPermissions.length} permissions`);

  // ─── INFLUENCER: influencer.read, influencer.update ───
  const influencerPermissions = allPermissions.filter((p) =>
    ['influencer.read', 'influencer.update'].includes(p.name)
  );
  for (const perm of influencerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: influencerRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: influencerRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ INFLUENCER: ${influencerPermissions.length} permissions`);

  // ─── BRAND_TEAM_MEMBER: team.read, brand.read ───
  const memberPermissions = allPermissions.filter((p) =>
    ['team.read', 'brand.read'].includes(p.name)
  );
  for (const perm of memberPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: teamMemberRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: teamMemberRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ BRAND_TEAM_MEMBER: ${memberPermissions.length} permissions`);

  // ─── SHOPPER: browse, cart, order, profile ───
  const shopperPermissions = allPermissions.filter((p) =>
    [
      'product.browse',
      'product.read',
      'cart.manage',
      'order.create',
      'order.read',
      'profile.update',
    ].includes(p.name)
  );
  for (const perm of shopperPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: shopperRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: shopperRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ SHOPPER: ${shopperPermissions.length} permissions`);

  // ─── AGENCY: full agency management ───
  const agencyPermissions = allPermissions.filter((p) =>
    [
      'agency.read',
      'agency.create',
      'agency.update',
      'agency.delete',
      'brand.read',
      'brand.create',
      'brand.update',
      'brand.delete',
      'product.read',
      'product.create',
      'product.update',
      'product.delete',
      'team.read',
      'team.create',
      'team.update',
      'team.delete',
      'user.read',
      'billing.read',
    ].includes(p.name)
  );
  for (const perm of agencyPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: agencyRole.id,
          permissionId: perm.id,
        },
      },
      update: {},
      create: { roleId: agencyRole.id, permissionId: perm.id },
    });
  }
  console.log(`  ✅ AGENCY: ${agencyPermissions.length} permissions`);

  console.log('\n✅ Seeding complete (roles + permissions).');
  console.log('');
  console.log('⚠️  No admin user created by this seed.');
  console.log('   To create the first admin, run:');
  console.log('     npm run seed:admin');
  console.log('   (Uses SEED_ADMIN_EMAIL + SEED_ADMIN_PASSWORD from .env)');
}

main()
  .catch((e) => {
    console.error('❌ Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });