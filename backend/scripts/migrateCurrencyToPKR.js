// backend/scripts/migrateCurrencyToPKR.js
// ======================================================
// One-time migration: Convert all USD wallets/payments
// to PKR at a fixed rate.
//
// SAFE:
//   - Dry-run by default (no writes)
//   - Requires --apply flag to actually write
//   - Prints before/after summary
//   - Wraps everything in a single transaction
// ======================================================
//
// Usage:
//   node scripts/migrateCurrencyToPKR.js                 # dry run (preview only)
//   node scripts/migrateCurrencyToPKR.js --apply         # actually migrate
//   node scripts/migrateCurrencyToPKR.js --rate 280      # custom rate
//
// ======================================================

require('dotenv').config();
const prisma = require('../src/config/prisma');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const RATE_FLAG = args.indexOf('--rate');
const USD_PKR_RATE = RATE_FLAG >= 0 && args[RATE_FLAG + 1]
  ? Number(args[RATE_FLAG + 1])
  : Number(process.env.USD_PKR_RATE || 278);

if (!Number.isFinite(USD_PKR_RATE) || USD_PKR_RATE <= 0) {
  console.error('❌ Invalid rate. Set USD_PKR_RATE in .env or pass --rate <number>');
  process.exit(1);
}

const log = (...a) => console.log(...a);
const hr = () => log('─'.repeat(60));

async function preview() {
  hr();
  log(`🔍 PREVIEW — Convert USD → PKR at rate ${USD_PKR_RATE}`);
  log(`   Mode: ${APPLY ? '⚠️  APPLY (will write)' : '🧪 DRY RUN (no changes)'}`);
  hr();

  // ---- Wallets ----
  const usdWallets = await prisma.wallet.findMany({
    where: { currency: 'USD' },
    include: {
      user: { select: { email: true, name: true } },
      organization: { select: { name: true, slug: true } },
      influencer: { select: { username: true, displayName: true } },
    },
  });

  log(`\n📦 WALLETS (USD → PKR): ${usdWallets.length}`);
  for (const w of usdWallets) {
    const owner =
      w.user?.email ||
      w.organization?.name ||
      w.influencer?.displayName ||
      '(unknown)';
    const before = Number(w.balanceCache);
    const after = before * USD_PKR_RATE;
    log(`   • ${owner.padEnd(30)} ${before.toFixed(2).padStart(12)} USD  →  ${after.toFixed(2).padStart(14)} PKR`);
  }

  // ---- Wallet Transactions ----
  const usdTxns = await prisma.walletTransaction.count({
    where: { currency: 'USD' },
  });
  log(`\n📒 WALLET TRANSACTIONS (USD → PKR): ${usdTxns}`);

  // ---- Payments ----
  const usdPayments = await prisma.payment.findMany({
    where: { currency: 'USD' },
    select: { id: true, invoiceNumber: true, amount: true, status: true },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });
  const totalPayments = await prisma.payment.count({ where: { currency: 'USD' } });

  log(`\n💳 PAYMENTS (USD → PKR): ${totalPayments}`);
  for (const p of usdPayments) {
    const before = Number(p.amount);
    const after = before * USD_PKR_RATE;
    log(`   • ${p.invoiceNumber.padEnd(30)} ${before.toFixed(2).padStart(12)} USD  →  ${after.toFixed(2).padStart(14)} PKR   [${p.status}]`);
  }
  if (totalPayments > usdPayments.length) {
    log(`   ... and ${totalPayments - usdPayments.length} more`);
  }

  // ---- Subscriptions (currency field) ----
  const usdSubs = await prisma.subscription.count({ where: { currency: 'USD' } });
  log(`\n📋 SUBSCRIPTIONS (USD → PKR): ${usdSubs}`);

  hr();
  log(`📊 SUMMARY`);
  log(`   Rate:                 1 USD = ${USD_PKR_RATE} PKR`);
  log(`   Wallets to update:    ${usdWallets.length}`);
  log(`   Transactions to update: ${usdTxns}`);
  log(`   Payments to update:   ${totalPayments}`);
  log(`   Subscriptions to update: ${usdSubs}`);
  hr();

  return { usdWallets, usdTxns, totalPayments, usdSubs };
}

async function apply() {
  hr();
  log(`⚠️  APPLYING MIGRATION — rate ${USD_PKR_RATE}`);
  hr();

  await prisma.$transaction(async (tx) => {
    // 1. Wallets
    const wallets = await tx.wallet.updateMany({
      where: { currency: 'USD' },
      data: {
        currency: 'PKR',
        balanceCache: { multiply: USD_PKR_RATE },
      },
    });
    log(`✅ Wallets updated:      ${wallets.count}`);

    // 2. Wallet Transactions
    const txns = await tx.walletTransaction.updateMany({
      where: { currency: 'USD' },
      data: {
        currency: 'PKR',
        amount: { multiply: USD_PKR_RATE },
        balanceAfter: { multiply: USD_PKR_RATE },
      },
    });
    log(`✅ Transactions updated: ${txns.count}`);

    // 3. Payments
    const payments = await tx.payment.updateMany({
      where: { currency: 'USD' },
      data: {
        currency: 'PKR',
        amount: { multiply: USD_PKR_RATE },
      },
    });
    log(`✅ Payments updated:     ${payments.count}`);

    // 4. Subscriptions
    const subs = await tx.subscription.updateMany({
      where: { currency: 'USD' },
      data: { currency: 'PKR' },
    });
    log(`✅ Subscriptions updated: ${subs.count}`);
  }, {
    timeout: 60000, // 60s — big tables
  });

  hr();
  log('🎉 Migration complete.');
  hr();
}

async function verify() {
  hr();
  log('🔎 POST-MIGRATION VERIFY');
  hr();

  const walletSummary = await prisma.wallet.groupBy({
    by: ['currency'],
    _count: { _all: true },
    _sum: { balanceCache: true },
  });
  log('\n💼 Wallets by currency:');
  for (const r of walletSummary) {
    log(`   ${r.currency}: ${r._count._all} wallets, total ${Number(r._sum.balanceCache || 0).toFixed(2)}`);
  }

  const paymentSummary = await prisma.payment.groupBy({
    by: ['currency'],
    _count: { _all: true },
    _sum: { amount: true },
  });
  log('\n💳 Payments by currency:');
  for (const r of paymentSummary) {
    log(`   ${r.currency}: ${r._count._all} payments, total ${Number(r._sum.amount || 0).toFixed(2)}`);
  }

  hr();
}

async function main() {
  try {
    const preview_data = await preview();

    if (!APPLY) {
      log('\n💡 Dry run complete. To actually migrate, run:');
      log(`   node scripts/migrateCurrencyToPKR.js --apply\n`);
      return;
    }

    // Confirm counts are sane
    const totalRows =
      preview_data.usdWallets.length +
      preview_data.usdTxns +
      preview_data.totalPayments +
      preview_data.usdSubs;

    if (totalRows === 0) {
      log('\n✅ Nothing to migrate — all data already in PKR.');
      return;
    }

    log(`\n⏳ Applying migration for ${totalRows} rows...\n`);
    await apply();
    await verify();
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();