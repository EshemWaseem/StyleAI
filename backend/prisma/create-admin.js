// backend/prisma/create-admin.js
// Creates (or ensures) a SUPER_ADMIN user from env vars.
// NO hardcoded credentials. Safe to commit.
//
// Usage:
//   node prisma/create-admin.js
//   npm run seed:admin
//
// Env vars required:
//   SEED_ADMIN_EMAIL       (e.g. admin@styleai.com)
//   SEED_ADMIN_PASSWORD    (strong password, e.g. min 12 chars)
//   SEED_ADMIN_NAME        (optional, default: "Super Admin")

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.SEED_ADMIN_EMAIL || '').trim().toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || '';
  const name = (process.env.SEED_ADMIN_NAME || 'Super Admin').trim();

  // ─── Validate inputs ───
  if (!email) {
    console.error('❌ SEED_ADMIN_EMAIL is not set in .env');
    console.error('   Add: SEED_ADMIN_EMAIL=admin@styleai.com');
    process.exit(1);
  }
  if (!password) {
    console.error('❌ SEED_ADMIN_PASSWORD is not set in .env');
    console.error('   Generate a strong password and add it to .env');
    process.exit(1);
  }
  if (password.length < 12) {
    console.error('❌ SEED_ADMIN_PASSWORD must be at least 12 characters');
    console.error('   Generate: node -e "console.log(require(\'crypto\').randomBytes(18).toString(\'base64\'))"');
    process.exit(1);
  }
  if (!email.includes('@')) {
    console.error('❌ SEED_ADMIN_EMAIL is not a valid email address');
    process.exit(1);
  }

  console.log('Creating super admin...');

  // ─── Find SUPER_ADMIN role (must exist — run seed first) ───
  const superAdminRole = await prisma.role.findUnique({
    where: { name: 'SUPER_ADMIN' },
  });
  if (!superAdminRole) {
    console.error('❌ SUPER_ADMIN role not found.');
    console.error('   Run `npx prisma db seed` first to create roles.');
    process.exit(1);
  }

  // ─── Hash password ───
  const hashedPassword = await bcrypt.hash(password, 12);

  // ─── Upsert user ───
  const existing = await prisma.user.findUnique({ where: { email } });

  let user;
  if (existing) {
    console.log(`  ℹ️  User ${email} already exists — updating password + role.`);
    user = await prisma.user.update({
      where: { email },
      data: {
        name: existing.name || name,
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        organizationId: null,
      },
    });
  } else {
    console.log(`  ℹ️  Creating new user ${email}.`);
    user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        isActive: true,
        emailVerified: true,
        organizationId: null,
      },
    });
  }

  // ─── Assign SUPER_ADMIN role (idempotent) ───
  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: user.id,
        roleId: superAdminRole.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      roleId: superAdminRole.id,
    },
  });

  console.log('');
  console.log('✅ Super admin ready.');
  console.log(`   Email:   ${email}`);
  console.log(`   User ID: ${user.id}`);
  console.log('');
  console.log('⚠️  Change this password after first login!');
}

main()
  .catch((e) => {
    console.error('❌ Create-admin error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });