// backend/scripts/resetBrandWallet.js
// ======================================================
// Reset a brand (organization) wallet to zero.
//
// SAFE:
//   - Dry-run by default (no writes)
//   - Requires --apply to actually reset
//   - Shows all transactions before wiping
//   - Wrapped in a transaction
//
// Usage:
//   node scripts/resetBrandWallet.js --brand "Noor"            # dry run
//   node scripts/resetBrandWallet.js --brand "Noor" --apply    # actually reset
//   node scripts/resetBrandWallet.js --brand "Noor" --keep-txns --apply
//       (keep transaction history, only zero the balance)
//
// ======================================================

require('dotenv').config();
const prisma = require('../src/config/prisma');

const args = process.argv.slice(2);

function getFlag(name) {
  const idx = args.indexOf(name);
  if (idx === -1) return null;
  return args[idx + 1] || null;
}
function hasFlag(name) {
  return args.includes(name);
}

const APPLY = hasFlag('--apply');
const KEEP_TXNS = hasFlag('--keep-txns');
const BRAND_QUERY = getFlag('--brand');

if (!BRAND_QUERY) {
  console.error('❌ Missing --brand "name" argument');
  console.error('   Example: node scripts/resetBrandWallet.js --brand "Noor"');
  process.exit(1);
}

const log = (...a) => console.log(...a);
const hr = () => log('─'.repeat(64));

// ------------------------------------------------------
// 1. Find brand wallet(s) matching the query
// ------------------------------------------------------
async function findWallets() {
  const orgs = await prisma.organization.findMany({
    where: {
      OR: [
        { name: { contains: BRAND_QUERY, mode: 'insensitive' } },
        { slug: { contains: BRAND_QUERY, mode: 'insensitive' } },
      ],
    },
    select: { id: true, name: true, slug: true },
  });

  if (orgs.length === 0) {
    log(`\n❌ No organization matched "${BRAND_QUERY}"`);
    return [];
  }

  if (orgs.length > 1) {
    log(`\n⚠️  Multiple organizations matched "${BRAND_QUERY}":`);
    for (const o of orgs) log(`   • ${o.name} (${o.slug}) — ${o.id}`);
    log('\n💡 Be more specific or use --brand with the exact name.');
    return [];
  }

  const org = orgs[0];
  const wallet = await prisma.wallet.findUnique({
    where: { organizationId: org.id },
    include: {
      transactions: { orderBy: { createdAt: 'asc' } },
    },
  });

  if (!wallet) {
    log(`\n⚠️  Organization found (${org.name}) but no wallet exists yet.`);
    log('   Nothing to reset — wallet will be created lazily on first use.');
    return [];
  }

  return [{ org, wallet }];
}

// ------------------------------------------------------
// 2. Preview
// ------------------------------------------------------
async function preview({ org, wallet }) {
  hr();
  log(`🔍 BRAND WALLET PREVIEW`);
  log(`   Mode: ${APPLY ? '⚠️  APPLY (will write)' : '🧪 DRY RUN (no changes)'}`);
  hr();

  log(`\n🏢 ORGANIZATION`);
  log(`   Name:     ${org.name}`);
  log(`   Slug:     ${org.slug}`);
  log(`   ID:       ${org.id}`);

  log(`\n💼 WALLET`);
  log(`   Wallet ID:      ${wallet.id}`);
  log(`   Currency:       ${wallet.currency}`);
  log(`   Balance (now):  ${Number(wallet.balanceCache).toFixed(2)}`);
  log(`   Created:        ${wallet.createdAt.toISOString()}`);
  log(`   Updated:        ${wallet.updatedAt.toISOString()}`);

  log(`\n📒 TRANSACTIONS (${wallet.transactions.length})`);

  if (wallet.transactions.length === 0) {
    log('   (none)');
  } else {
    log('');
    log('   #  | Type            | Status    | Amount      | Currency | Balance After | Created');
    log('   ---|-----------------|-----------|-------------|----------|---------------|--------');
    wallet.transactions.forEach((t, i) => {
      const num = String(i + 1).padStart(2);
      const type = String(t.type).padEnd(15);
      const status = String(t.status).padEnd(9);
      const amount = Number(t.amount).toFixed(2).padStart(11);
      const currency = String(t.currency).padEnd(8);
      const bal = Number(t.balanceAfter).toFixed(2).padStart(13);
      const dt = t.createdAt.toISOString().split('T')[0];
      log(`   ${num} | ${type} | ${status} | ${amount} | ${currency} | ${bal} | ${dt}`);
    });

    // Note lines (separate — they can be long)
    log('\n   Notes / references:');
    wallet.transactions.forEach((t, i) => {
      const note = t.note || '(no note)';
      const ref = t.reference ? ` · ref: ${t.reference}` : '';
      log(`   [${String(i + 1).padStart(2)}] ${note}${ref}`);
    });
  }

  hr();
  log(`📊 PLAN`);
  log(`   Balance to reset:    ${Number(wallet.balanceCache).toFixed(2)} ${wallet.currency}`);
  if (KEEP_TXNS) {
    log(`   Transactions:        KEEP (--keep-txns set)`);
  } else {
    log(`   Transactions:        DELETE ALL (${wallet.transactions.length})`);
  }
  hr();

  return wallet;
}

// ------------------------------------------------------
// 3. Apply
// ------------------------------------------------------
async function apply(wallet) {
  hr();
  log('⚠️  APPLYING RESET');
  hr();

  await prisma.$transaction(async (tx) => {
    if (!KEEP_TXNS && wallet.transactions.length > 0) {
      const del = await tx.walletTransaction.deleteMany({
        where: { walletId: wallet.id },
      });
      log(`✅ Transactions deleted:   ${del.count}`);
    } else {
      log(`ℹ️  Transactions kept:      ${wallet.transactions.length}`);
    }

    await tx.wallet.update({
      where: { id: wallet.id },
      data: { balanceCache: 0 },
    });
    log(`✅ Wallet balance reset:   0.00 ${wallet.currency}`);
  }, { timeout: 30000 });

  hr();
  log('🎉 Reset complete.');
  hr();
}

// ------------------------------------------------------
// 4. Verify
// ------------------------------------------------------
async function verify(walletId) {
  const w = await prisma.wallet.findUnique({
    where: { id: walletId },
    include: { _count: { select: { transactions: true } } },
  });

  hr();
  log('🔎 POST-RESET VERIFY');
  hr();
  log(`   Balance now:        ${Number(w.balanceCache).toFixed(2)} ${w.currency}`);
  log(`   Transactions now:   ${w._count.transactions}`);
  hr();
}

// ------------------------------------------------------
// Main
// ------------------------------------------------------
async function main() {
  try {
    const matches = await findWallets();
    if (matches.length === 0) return;

    const wallet = await preview(matches[0]);

    if (!APPLY) {
      log('\n💡 Dry run complete. To actually reset, run:');
      const keepFlag = KEEP_TXNS ? ' --keep-txns' : '';
      log(`   node scripts/resetBrandWallet.js --brand "${BRAND_QUERY}"${keepFlag} --apply\n`);
      return;
    }

    if (wallet.transactions.length === 0 && Number(wallet.balanceCache) === 0) {
      log('\n✅ Already clean — nothing to do.');
      return;
    }

    await apply(wallet);
    await verify(wallet.id);
  } catch (err) {
    console.error('\n❌ Reset failed:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();