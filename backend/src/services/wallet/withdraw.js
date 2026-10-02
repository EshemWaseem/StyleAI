// services/wallet/withdraw.js
// ======================================================
// Influencer requests withdrawal → PENDING row
// Admin approves → COMPLETED + balance debit + notify owner
// Admin rejects  → FAILED (balance untouched) + notify owner
//
// ✅ NEW: email notifications (admin on request, user on review).
// ======================================================

const prisma = require('../../config/prisma');
const { httpError } = require('../influencer/helpers');
const { writeAudit, parsePagination } = require('../admin/helpers');
const { notifyUser, notifyAdmins } = require('../notifications');
const {
  getFinanceRules,
  postTransaction,
  shapeTransaction,
} = require('./helpers');

// ------------------------------------------------------
// Resolve wallet owner's userId (user OR influencer)
// ------------------------------------------------------
async function resolveWalletOwnerUserId(wallet) {
  if (!wallet) return null;
  if (wallet.userId) return wallet.userId;
  if (wallet.influencerId) {
    const inf = await prisma.influencer.findUnique({
      where: { id: wallet.influencerId },
      select: { userId: true },
    });
    return inf?.userId ?? null;
  }
  return null;
}

// ------------------------------------------------------
// Resolve display name of wallet owner
// ------------------------------------------------------
async function resolveOwnerDisplayName(wallet) {
  if (wallet.userId) {
    const u = await prisma.user.findUnique({
      where: { id: wallet.userId },
      select: { name: true, email: true },
    });
    return u?.name || u?.email || 'User';
  }
  if (wallet.influencerId) {
    const inf = await prisma.influencer.findUnique({
      where: { id: wallet.influencerId },
      select: { displayName: true, username: true },
    });
    return inf?.displayName || inf?.username || 'Influencer';
  }
  return 'User';
}

// ======================================================
// REQUEST — influencer/owner asks for withdrawal
// ======================================================
async function requestWithdrawal(user, payload = {}) {
  const { amount, method, destination, note } = payload;

  const numeric = Number(amount);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    throw httpError('amount must be a positive number', 400, 'INVALID_AMOUNT');
  }

  if (!method || !['bank', 'paypal', 'stripe'].includes(method)) {
    throw httpError('method must be bank, paypal, or stripe', 400, 'INVALID_METHOD');
  }

  if (!destination || String(destination).trim().length < 3) {
    throw httpError('destination is required (account/email)', 400, 'INVALID_DESTINATION');
  }

  const finance = await getFinanceRules();
  const minWithdrawal = Number(finance.minWithdrawalAmount ?? 50);
  if (numeric < minWithdrawal) {
    throw httpError(
      `Minimum withdrawal is ${minWithdrawal}`,
      400,
      'BELOW_MIN_WITHDRAWAL'
    );
  }

  const wallet = await prisma.wallet.findFirst({
    where: user.roles?.includes('INFLUENCER')
      ? { influencer: { userId: user.id } }
      : { userId: user.id },
  });
  if (!wallet) throw httpError('Wallet not found — earn first', 404, 'NO_WALLET');

  if (Number(wallet.balanceCache) < numeric) {
    throw httpError(
      `Insufficient balance. Available: ${Number(wallet.balanceCache).toFixed(2)} ${wallet.currency}`,
      400,
      'INSUFFICIENT_BALANCE'
    );
  }

  const existingPending = await prisma.walletTransaction.findFirst({
    where: { walletId: wallet.id, type: 'WITHDRAWAL', status: 'PENDING' },
  });
  if (existingPending) {
    throw httpError(
      'You already have a pending withdrawal request',
      400,
      'PENDING_EXISTS'
    );
  }

  const txn = await prisma.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: 'WITHDRAWAL',
      status: 'PENDING',
      amount: -numeric,
      balanceAfter: Number(wallet.balanceCache),
      currency: wallet.currency,
      note: note || `Withdrawal via ${method}`,
      reference: null,
      meta: { method, destination: String(destination).trim() },
    },
  });

  await writeAudit({
    actorId: user.id,
    action: 'wallet.withdrawal.request',
    targetType: 'WalletTransaction',
    targetId: txn.id,
    meta: { amount: numeric, method, currency: wallet.currency },
  });

  // Notify all admins (in-app + email)
  const ownerName = await resolveOwnerDisplayName(wallet);

  await notifyAdmins({
    type: 'WITHDRAWAL_REQUESTED',
    title: 'New withdrawal request',
    body: `A withdrawal of ${wallet.currency} ${numeric.toFixed(2)} needs review.`,
    link: '/admin/withdrawals',
    meta: { txnId: txn.id, amount: numeric, currency: wallet.currency },
    // ✅ EMAIL
    emailTemplate: 'withdrawalRequested',
    emailData: {
      userName: ownerName,
      amount: numeric,
      currency: wallet.currency,
      reference: txn.id.slice(0, 8),
    },
  });

  return shapeTransaction(txn);
}

// ======================================================
// REVIEW — admin approves or rejects
// ======================================================
async function reviewWithdrawal(adminUser, txnId, payload = {}) {
  const { decision, adminNote } = payload;
  if (!['approve', 'reject'].includes(decision)) {
    throw httpError('decision must be approve or reject', 400, 'INVALID_DECISION');
  }

  const txn = await prisma.walletTransaction.findUnique({
    where: { id: txnId },
    include: { wallet: true },
  });
  if (!txn) throw httpError('Withdrawal not found', 404, 'NOT_FOUND');
  if (txn.type !== 'WITHDRAWAL') throw httpError('Not a withdrawal', 400, 'NOT_WITHDRAWAL');
  if (txn.status !== 'PENDING') {
    throw httpError('Already reviewed', 400, 'ALREADY_REVIEWED');
  }

  const ownerUserId = await resolveWalletOwnerUserId(txn.wallet);

  // ---------- REJECT ----------
  if (decision === 'reject') {
    const updated = await prisma.walletTransaction.update({
      where: { id: txnId },
      data: {
        status: 'FAILED',
        note: adminNote
          ? `${txn.note} — Rejected: ${adminNote}`
          : `${txn.note} — Rejected`,
      },
    });

    await writeAudit({
      actorId: adminUser.id,
      action: 'wallet.withdrawal.reject',
      targetType: 'WalletTransaction',
      targetId: txnId,
      meta: { amount: Number(txn.amount), adminNote: adminNote || null },
    });

    // Notify owner (in-app + email)
    if (ownerUserId) {
      await notifyUser(ownerUserId, {
        type: 'WITHDRAWAL_REJECTED',
        title: 'Withdrawal rejected',
        body:
          adminNote ||
          `Your withdrawal request of ${txn.currency} ${Math.abs(Number(txn.amount)).toFixed(2)} was rejected.`,
        link: '/wallet',
        meta: {
          txnId,
          amount: Math.abs(Number(txn.amount)),
          currency: txn.currency,
          reason: adminNote || null,
        },
        // ✅ EMAIL
        emailTemplate: 'withdrawalReviewed',
        emailData: {
          amount: Math.abs(Number(txn.amount)),
          currency: txn.currency,
          approved: false,
          reference: txn.id.slice(0, 8),
          reason: adminNote || null,
        },
      });
    }

    return shapeTransaction(updated);
  }

  // ---------- APPROVE ----------
  const amount = Math.abs(Number(txn.amount));
  if (Number(txn.wallet.balanceCache) < amount) {
    throw httpError('Insufficient balance at approval time', 400, 'INSUFFICIENT_BALANCE');
  }

  const result = await prisma.$transaction(async (t) => {
    const debit = await postTransaction(t, {
      walletId: txn.walletId,
      type: 'WITHDRAWAL',
      status: 'COMPLETED',
      amount: -amount,
      currency: txn.currency,
      note: `${txn.note} — Approved`,
      meta: {
        ...(txn.meta || {}),
        approvedBy: adminUser.id,
        approvedAt: new Date().toISOString(),
      },
      createdBy: adminUser.id,
    });

    await t.walletTransaction.update({
      where: { id: txnId },
      data: { status: 'REVERSED' },
    });

    return debit;
  });

  await writeAudit({
    actorId: adminUser.id,
    action: 'wallet.withdrawal.approve',
    targetType: 'WalletTransaction',
    targetId: txnId,
    meta: { amount, currency: txn.currency },
  });

  // Notify owner (in-app + email)
  if (ownerUserId) {
    await notifyUser(ownerUserId, {
      type: 'WITHDRAWAL_APPROVED',
      title: 'Withdrawal approved',
      body: `${txn.currency} ${amount.toFixed(2)} is on its way to your ${
        txn.meta?.method || 'account'
      }.`,
      link: '/wallet',
      meta: { txnId, amount, currency: txn.currency },
      // ✅ EMAIL
      emailTemplate: 'withdrawalReviewed',
      emailData: {
        amount,
        currency: txn.currency,
        approved: true,
        reference: txn.id.slice(0, 8),
      },
    });
  }

  return shapeTransaction(result);
}

// ======================================================
// LIST — admin view of all withdrawals
// ======================================================
async function listWithdrawals(adminUser, query = {}) {
  const { limit, offset } = parsePagination(query);

  const where = { type: 'WITHDRAWAL' };
  if (query.status) where.status = query.status;

  const [rows, total] = await Promise.all([
    prisma.walletTransaction.findMany({
      where,
      include: {
        wallet: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            influencer: { select: { id: true, displayName: true, username: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.walletTransaction.count({ where }),
  ]);

  return {
    withdrawals: rows.map((r) => ({
      ...shapeTransaction(r),
      owner: r.wallet.user
        ? { type: 'user', name: r.wallet.user.name, email: r.wallet.user.email }
        : r.wallet.influencer
        ? {
            type: 'influencer',
            name: r.wallet.influencer.displayName,
            email: r.wallet.influencer.username,
          }
        : { type: 'unknown', name: '—', email: '—' },
      method: r.meta?.method || '—',
      destination: r.meta?.destination || '—',
    })),
    total,
    limit,
    offset,
  };
}

module.exports = { requestWithdrawal, reviewWithdrawal, listWithdrawals };








// 02-10
// // services/wallet/withdraw.js
// // ======================================================
// // Influencer requests withdrawal → PENDING row
// // Admin approves → COMPLETED + balance debit + notify owner
// // Admin rejects  → FAILED (balance untouched) + notify owner
// // ======================================================

// const prisma = require('../../config/prisma');
// const { httpError } = require('../influencer/helpers');
// const { writeAudit, parsePagination } = require('../admin/helpers');
// const { notifyUser, notifyAdmins } = require('../notifications');
// const {
//   getFinanceRules,
//   postTransaction,
//   shapeTransaction,
// } = require('./helpers');

// // ------------------------------------------------------
// // Resolve wallet owner's userId (user OR influencer)
// // ------------------------------------------------------
// async function resolveWalletOwnerUserId(wallet) {
//   if (!wallet) return null;
//   if (wallet.userId) return wallet.userId;
//   if (wallet.influencerId) {
//     const inf = await prisma.influencer.findUnique({
//       where: { id: wallet.influencerId },
//       select: { userId: true },
//     });
//     return inf?.userId ?? null;
//   }
//   return null;
// }

// // ======================================================
// // REQUEST — influencer/owner asks for withdrawal
// // ======================================================
// async function requestWithdrawal(user, payload = {}) {
//   const { amount, method, destination, note } = payload;

//   const numeric = Number(amount);
//   if (!Number.isFinite(numeric) || numeric <= 0) {
//     throw httpError('amount must be a positive number', 400, 'INVALID_AMOUNT');
//   }

//   if (!method || !['bank', 'paypal', 'stripe'].includes(method)) {
//     throw httpError('method must be bank, paypal, or stripe', 400, 'INVALID_METHOD');
//   }

//   if (!destination || String(destination).trim().length < 3) {
//     throw httpError('destination is required (account/email)', 400, 'INVALID_DESTINATION');
//   }

//   const finance = await getFinanceRules();
//   const minWithdrawal = Number(finance.minWithdrawalAmount ?? 50);
//   if (numeric < minWithdrawal) {
//     throw httpError(
//       `Minimum withdrawal is ${minWithdrawal}`,
//       400,
//       'BELOW_MIN_WITHDRAWAL'
//     );
//   }

//   const wallet = await prisma.wallet.findFirst({
//     where: user.roles?.includes('INFLUENCER')
//       ? { influencer: { userId: user.id } }
//       : { userId: user.id },
//   });
//   if (!wallet) throw httpError('Wallet not found — earn first', 404, 'NO_WALLET');

//   if (Number(wallet.balanceCache) < numeric) {
//     throw httpError(
//       `Insufficient balance. Available: ${Number(wallet.balanceCache).toFixed(2)} ${wallet.currency}`,
//       400,
//       'INSUFFICIENT_BALANCE'
//     );
//   }

//   const existingPending = await prisma.walletTransaction.findFirst({
//     where: { walletId: wallet.id, type: 'WITHDRAWAL', status: 'PENDING' },
//   });
//   if (existingPending) {
//     throw httpError(
//       'You already have a pending withdrawal request',
//       400,
//       'PENDING_EXISTS'
//     );
//   }

//   const txn = await prisma.walletTransaction.create({
//     data: {
//       walletId: wallet.id,
//       type: 'WITHDRAWAL',
//       status: 'PENDING',
//       amount: -numeric,
//       balanceAfter: Number(wallet.balanceCache), // unchanged until approval
//       currency: wallet.currency,
//       note: note || `Withdrawal via ${method}`,
//       reference: null,
//       meta: { method, destination: String(destination).trim() },
//     },
//   });

//   await writeAudit({
//     actorId: user.id,
//     action: 'wallet.withdrawal.request',
//     targetType: 'WalletTransaction',
//     targetId: txn.id,
//     meta: { amount: numeric, method, currency: wallet.currency },
//   });

//   // Notify all admins
//   await notifyAdmins({
//     type: 'WITHDRAWAL_REQUESTED',
//     title: 'New withdrawal request',
//     body: `A withdrawal of ${wallet.currency} ${numeric.toFixed(2)} needs review.`,
//     link: '/admin/withdrawals',
//     meta: { txnId: txn.id, amount: numeric, currency: wallet.currency },
//   });

//   return shapeTransaction(txn);
// }

// // ======================================================
// // REVIEW — admin approves or rejects
// // ======================================================
// async function reviewWithdrawal(adminUser, txnId, payload = {}) {
//   const { decision, adminNote } = payload;
//   if (!['approve', 'reject'].includes(decision)) {
//     throw httpError('decision must be approve or reject', 400, 'INVALID_DECISION');
//   }

//   const txn = await prisma.walletTransaction.findUnique({
//     where: { id: txnId },
//     include: { wallet: true },
//   });
//   if (!txn) throw httpError('Withdrawal not found', 404, 'NOT_FOUND');
//   if (txn.type !== 'WITHDRAWAL') throw httpError('Not a withdrawal', 400, 'NOT_WITHDRAWAL');
//   if (txn.status !== 'PENDING') {
//     throw httpError('Already reviewed', 400, 'ALREADY_REVIEWED');
//   }

//   const ownerUserId = await resolveWalletOwnerUserId(txn.wallet);

//   // ---------- REJECT ----------
//   if (decision === 'reject') {
//     const updated = await prisma.walletTransaction.update({
//       where: { id: txnId },
//       data: {
//         status: 'FAILED',
//         note: adminNote
//           ? `${txn.note} — Rejected: ${adminNote}`
//           : `${txn.note} — Rejected`,
//       },
//     });

//     await writeAudit({
//       actorId: adminUser.id,
//       action: 'wallet.withdrawal.reject',
//       targetType: 'WalletTransaction',
//       targetId: txnId,
//       meta: { amount: Number(txn.amount), adminNote: adminNote || null },
//     });

//     // Notify owner
//     if (ownerUserId) {
//       await notifyUser(ownerUserId, {
//         type: 'WITHDRAWAL_REJECTED',
//         title: 'Withdrawal rejected',
//         body:
//           adminNote ||
//           `Your withdrawal request of ${txn.currency} ${Math.abs(Number(txn.amount)).toFixed(2)} was rejected.`,
//         link: '/wallet',
//         meta: {
//           txnId,
//           amount: Math.abs(Number(txn.amount)),
//           currency: txn.currency,
//           reason: adminNote || null,
//         },
//       });
//     }

//     return shapeTransaction(updated);
//   }

//   // ---------- APPROVE ----------
//   const amount = Math.abs(Number(txn.amount));
//   if (Number(txn.wallet.balanceCache) < amount) {
//     throw httpError('Insufficient balance at approval time', 400, 'INSUFFICIENT_BALANCE');
//   }

//   const result = await prisma.$transaction(async (t) => {
//     const debit = await postTransaction(t, {
//       walletId: txn.walletId,
//       type: 'WITHDRAWAL',
//       status: 'COMPLETED',
//       amount: -amount,
//       currency: txn.currency,
//       note: `${txn.note} — Approved`,
//       meta: {
//         ...(txn.meta || {}),
//         approvedBy: adminUser.id,
//         approvedAt: new Date().toISOString(),
//       },
//       createdBy: adminUser.id,
//     });

//     // Mark the original PENDING row as REVERSED so it doesn't double-count
//     await t.walletTransaction.update({
//       where: { id: txnId },
//       data: { status: 'REVERSED' },
//     });

//     return debit;
//   });

//   await writeAudit({
//     actorId: adminUser.id,
//     action: 'wallet.withdrawal.approve',
//     targetType: 'WalletTransaction',
//     targetId: txnId,
//     meta: { amount, currency: txn.currency },
//   });

//   // Notify owner
//   if (ownerUserId) {
//     await notifyUser(ownerUserId, {
//       type: 'WITHDRAWAL_APPROVED',
//       title: 'Withdrawal approved',
//       body: `${txn.currency} ${amount.toFixed(2)} is on its way to your ${
//         txn.meta?.method || 'account'
//       }.`,
//       link: '/wallet',
//       meta: { txnId, amount, currency: txn.currency },
//     });
//   }

//   return shapeTransaction(result);
// }

// // ======================================================
// // LIST — admin view of all withdrawals
// // ======================================================
// async function listWithdrawals(adminUser, query = {}) {
//   const { limit, offset } = parsePagination(query);

//   const where = { type: 'WITHDRAWAL' };
//   if (query.status) where.status = query.status;

//   const [rows, total] = await Promise.all([
//     prisma.walletTransaction.findMany({
//       where,
//       include: {
//         wallet: {
//           include: {
//             user: { select: { id: true, name: true, email: true } },
//             influencer: { select: { id: true, displayName: true, username: true } },
//           },
//         },
//       },
//       orderBy: { createdAt: 'desc' },
//       take: limit,
//       skip: offset,
//     }),
//     prisma.walletTransaction.count({ where }),
//   ]);

//   return {
//     withdrawals: rows.map((r) => ({
//       ...shapeTransaction(r),
//       owner: r.wallet.user
//         ? { type: 'user', name: r.wallet.user.name, email: r.wallet.user.email }
//         : r.wallet.influencer
//         ? {
//             type: 'influencer',
//             name: r.wallet.influencer.displayName,
//             email: r.wallet.influencer.username,
//           }
//         : { type: 'unknown', name: '—', email: '—' },
//       method: r.meta?.method || '—',
//       destination: r.meta?.destination || '—',
//     })),
//     total,
//     limit,
//     offset,
//   };
// }

// module.exports = { requestWithdrawal, reviewWithdrawal, listWithdrawals };