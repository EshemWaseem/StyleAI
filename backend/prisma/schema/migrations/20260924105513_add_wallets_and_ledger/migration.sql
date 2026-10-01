-- CreateEnum
CREATE TYPE "public"."WalletTxType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'OFFER_HOLD', 'OFFER_RELEASE', 'OFFER_REFUND', 'PLATFORM_FEE', 'ADJUSTMENT');

-- CreateEnum
CREATE TYPE "public"."WalletTxStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'REVERSED');

-- AlterTable
ALTER TABLE "public"."CustomOffer" ADD COLUMN     "escrowHeldAt" TIMESTAMP(3),
ADD COLUMN     "escrowReleasedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "public"."Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "organizationId" TEXT,
    "influencerId" TEXT,
    "currency" TEXT NOT NULL,
    "balanceCache" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."WalletTransaction" (
    "id" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "type" "public"."WalletTxType" NOT NULL,
    "status" "public"."WalletTxStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(14,2) NOT NULL,
    "balanceAfter" DECIMAL(14,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "offerId" TEXT,
    "paymentId" TEXT,
    "reference" TEXT,
    "note" TEXT,
    "meta" JSONB,
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "public"."Wallet"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_organizationId_key" ON "public"."Wallet"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_influencerId_key" ON "public"."Wallet"("influencerId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "public"."WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_type_status_idx" ON "public"."WalletTransaction"("type", "status");

-- CreateIndex
CREATE INDEX "WalletTransaction_offerId_idx" ON "public"."WalletTransaction"("offerId");

-- CreateIndex
CREATE INDEX "WalletTransaction_reference_idx" ON "public"."WalletTransaction"("reference");

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Wallet" ADD CONSTRAINT "Wallet_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "public"."Wallet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."CustomOffer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."WalletTransaction" ADD CONSTRAINT "WalletTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "public"."Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
