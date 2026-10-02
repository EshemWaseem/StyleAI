// scripts/cleanup-test-payments.js
// ======================================================
// Cleanup test / stale payment data
//
// Usage:
//   node scripts/cleanup-test-payments.js              (dry-run)
//   node scripts/cleanup-test-payments.js --execute    (actually delete)
//
// Rules:
//   1. PENDING payments older than 1 hour → mark FAILED
//   2. FAILED payments older than 7 days    → delete
//   3. RE-FAILED subscriptions (trial, no stripe) → reset to fresh
// ======================================================

const prisma = require('../src/config/prisma');

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

const EXECUTE = process.argv.includes('--execute');

async function main() {
  console.log(`\n🧹 Payment cleanup — mode: ${EXECUTE ? 'EXECUTE' : 'DRY-RUN'}\n`);

  const now = new Date();

  // --------------------------------------------------
  // 1. PENDING payments older than 1 hour → FAILED
  // --------------------------------------------------
  const stalePendings = await prisma.payment.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: new Date(now.getTime() - HOUR_MS) },
    },
    select: { id: true, invoiceNumber: true, createdAt: true, amount: true },
  });

  console.log(`[1] PENDING > 1h  →  FAILED  (${stalePendings.length})`);
  stalePendings.forEach((p) =>
    console.log(`    - ${p.invoiceNumber} (${p.amount}) created ${p.createdAt.toISOString()}`)
  );

  // --------------------------------------------------
  // 2. FAILED payments older than 7 days → delete
  // --------------------------------------------------
  const oldFaileds = await prisma.payment.findMany({
    where: {
      status: 'FAILED',
      createdAt: { lt: new Date(now.getTime() - 7 * DAY_MS) },
    },
    select: { id: true, invoiceNumber: true, createdAt: true },
  });

  console.log(`\n[2] FAILED > 7d   →  DELETE  (${oldFaileds.length})`);
  oldFaileds.forEach((p) =>
    console.log(`    - ${p.invoiceNumber} created ${p.createdAt.toISOString()}`)
  );

  // --------------------------------------------------
  // 3. Orphan trial subscriptions (> 30 days, no stripe sub)
  // --------------------------------------------------
  const staleTrials = await prisma.subscription.findMany({
    where: {
      isTrial: true,
      status: 'ACTIVE',
      stripeSubscriptionId: null,
      trialEndsAt: { lt: new Date(now.getTime() - 30 * DAY_MS) },
    },
    select: { id: true, organizationId: true, userId: true, trialEndsAt: true },
  });

  console.log(`\n[3] Stale trials  →  EXPIRED  (${staleTrials.length})`);
  staleTrials.forEach((s) =>
    console.log(`    - sub ${s.id} (org: ${s.organizationId}, ended ${s.trialEndsAt?.toISOString()})`)
  );

  // --------------------------------------------------
  // Execute
  // --------------------------------------------------
  if (!EXECUTE) {
    console.log('\n💡 This was a DRY-RUN. To apply changes, re-run with:');
    console.log('   node scripts/cleanup-test-payments.js --execute\n');
    return;
  }

  console.log('\n⚡ Executing...\n');

  const [r1, r2, r3] = await Promise.all([
    prisma.payment.updateMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: new Date(now.getTime() - HOUR_MS) },
      },
      data: { status: 'FAILED' },
    }),
    prisma.payment.deleteMany({
      where: {
        status: 'FAILED',
        createdAt: { lt: new Date(now.getTime() - 7 * DAY_MS) },
      },
    }),
    prisma.subscription.updateMany({
      where: {
        isTrial: true,
        status: 'ACTIVE',
        stripeSubscriptionId: null,
        trialEndsAt: { lt: new Date(now.getTime() - 30 * DAY_MS) },
      },
      data: { status: 'EXPIRED' },
    }),
  ]);

  console.log(`✅ Marked ${r1.count} stale PENDING → FAILED`);
  console.log(`✅ Deleted ${r2.count} old FAILED payments`);
  console.log(`✅ Marked ${r3.count} stale trials → EXPIRED`);
  console.log('\nDone.\n');
}

main()
  .catch((err) => {
    console.error('❌ Cleanup failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());