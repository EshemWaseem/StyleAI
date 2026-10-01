// services/billing/helpers.js
const prisma = require('../../config/prisma');

function generateInvoiceNumber() {
  const now = new Date();
  const ym = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `INV-${ym}-${rand}`;
}

async function ensureSubscription(organizationId) {
  let sub = await prisma.subscription.findUnique({
    where: { organizationId },
  });
  if (sub) return sub;

  sub = await prisma.subscription.create({
    data: {
      organizationId,
      planName: "free",
      status: "ACTIVE",
      currentPeriodStart: new Date(),
    },
  });
  return sub;
}

function shapeSubscription(s) {
  return {
    id: s.id,
    planName: s.planName,
    status: s.status,
    currency: s.currency,
    currentPeriodStart: s.currentPeriodStart,
    currentPeriodEnd: s.currentPeriodEnd,
    cancelAtPeriodEnd: s.cancelAtPeriodEnd,
    cancelledAt: s.cancelledAt,
    createdAt: s.createdAt,
  };
}

function shapePayment(p) {
  return {
    id: p.id,
    invoiceNumber: p.invoiceNumber,
    amount: Number(p.amount),
    currency: p.currency,
    status: p.status,
    description: p.description,
    paidAt: p.paidAt,
    periodStart: p.periodStart,
    periodEnd: p.periodEnd,
    createdAt: p.createdAt,
  };
}

module.exports = {
  generateInvoiceNumber,
  ensureSubscription,
  shapeSubscription,
  shapePayment,
};