const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================
  // 1. Create all 5 roles
  // ============================
  const roles = [
    { name: 'SUPER_ADMIN', description: 'Platform super admin' },
    { name: 'BRAND_OWNER', description: 'Owns an organization/brand' },
    { name: 'BRAND_TEAM_MEMBER', description: 'Team member of a brand' },
    { name: 'INFLUENCER', description: 'Content creator / influencer' },
    { name: 'AGENCY', description: 'Manages multiple brands' },
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
    console.log(`  Role: ${role.name}`);
  }

  // ============================
  // 2. Create permissions
  // ============================
  const permissions = [
    { name: 'user.create' },
    { name: 'user.read' },
    { name: 'user.update' },
    { name: 'user.delete' },
    { name: 'organization.create' },
    { name: 'organization.read' },
    { name: 'organization.update' },
    { name: 'organization.delete' },
    { name: 'brand.create' },
    { name: 'brand.read' },
    { name: 'brand.update' },
    { name: 'brand.delete' },
    { name: 'product.create' },
    { name: 'product.read' },
    { name: 'product.update' },
    { name: 'product.delete' },
    { name: 'team.create' },
    { name: 'team.read' },
    { name: 'team.update' },
    { name: 'team.delete' },
    { name: 'billing.read' },
    { name: 'billing.manage' },
  ];

  for (const perm of permissions) {
    await prisma.permission.upsert({
      where: { name: perm.name },
      update: {},
      create: perm,
    });
  }
  console.log(`  ${permissions.length} permissions created`);

  // ============================
  // 3. Assign permissions to roles
  // ============================
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
  const brandOwnerRole = await prisma.role.findUnique({ where: { name: 'BRAND_OWNER' } });
  const teamMemberRole = await prisma.role.findUnique({ where: { name: 'BRAND_TEAM_MEMBER' } });

  const allPermissions = await prisma.permission.findMany();

  // SUPER_ADMIN gets ALL
  for (const perm of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: superAdminRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: superAdminRole.id, permissionId: perm.id },
    });
  }
  console.log(`  SUPER_ADMIN: all permissions`);

  // BRAND_OWNER: brand, product, team, billing, organization
  const ownerPermissions = allPermissions.filter((p) =>
    ['brand', 'product', 'team', 'billing', 'organization'].some((prefix) =>
      p.name.startsWith(prefix)
    )
  );
  for (const perm of ownerPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: brandOwnerRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: brandOwnerRole.id, permissionId: perm.id },
    });
  }
  console.log(`  BRAND_OWNER: ${ownerPermissions.length} permissions`);

  // BRAND_TEAM_MEMBER: limited
  const memberPermissions = allPermissions.filter((p) =>
    ['product.read', 'product.create', 'product.update', 'brand.read', 'team.read'].includes(p.name)
  );
  for (const perm of memberPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: { roleId: teamMemberRole.id, permissionId: perm.id },
      },
      update: {},
      create: { roleId: teamMemberRole.id, permissionId: perm.id },
    });
  }
  console.log(`  BRAND_TEAM_MEMBER: ${memberPermissions.length} permissions`);

  // ============================
  // 4. Create SUPER_ADMIN user
  // ============================
  const hashedPassword = await bcrypt.hash('Admin@123', 10);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'admin@styleai.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@styleai.com',
      password: hashedPassword,
      isActive: true,
      organizationId: null,
    },
  });
  console.log(`  Super Admin: ${superAdmin.email}`);

  await prisma.userRole.upsert({
    where: {
      userId_roleId: { userId: superAdmin.id, roleId: superAdminRole.id },
    },
    update: {},
    create: { userId: superAdmin.id, roleId: superAdminRole.id },
  });
  console.log(`  SUPER_ADMIN role assigned`);

  console.log('');
  console.log('Seeding complete!');
  console.log('');
  console.log('Login credentials:');
  console.log('   Email:    admin@styleai.com');
  console.log('   Password: Admin@123');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });