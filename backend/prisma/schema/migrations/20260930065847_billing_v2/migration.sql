/*
  Warnings:

  - You are about to alter the column `amount` on the `Payment` table. The data in that column could be lost. The data in that column will be cast from `Decimal(65,30)` to `Decimal(12,2)`.
  - You are about to drop the column `externalId` on the `Subscription` table. All the data in the column will be lost.
  - You are about to drop the column `plan` on the `Subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[invoiceNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[organizationId]` on the table `Subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `invoiceNumber` to the `Payment` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "public"."Payment_organizationId_idx";

-- DropIndex
DROP INDEX "public"."Subscription_organizationId_idx";

-- AlterTable
ALTER TABLE "public"."Payment" ADD COLUMN     "invoiceNumber" TEXT NOT NULL,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "periodEnd" TIMESTAMP(3),
ADD COLUMN     "periodStart" TIMESTAMP(3),
ADD COLUMN     "stripeInvoiceId" TEXT,
ADD COLUMN     "stripePaymentIntentId" TEXT,
ADD COLUMN     "subscriptionId" TEXT,
ALTER COLUMN "amount" SET DATA TYPE DECIMAL(12,2),
ALTER COLUMN "currency" SET DEFAULT 'USD';

-- AlterTable
ALTER TABLE "public"."Subscription" DROP COLUMN "externalId",
DROP COLUMN "plan",
ADD COLUMN     "cancelledAt" TIMESTAMP(3),
ADD COLUMN     "currency" TEXT NOT NULL DEFAULT 'USD',
ADD COLUMN     "planName" TEXT NOT NULL DEFAULT 'free',
ADD COLUMN     "stripeCustomerId" TEXT,
ADD COLUMN     "stripeSubscriptionId" TEXT,
ALTER COLUMN "status" SET DEFAULT 'ACTIVE',
ALTER COLUMN "currentPeriodStart" SET DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "currentPeriodEnd" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_invoiceNumber_key" ON "public"."Payment"("invoiceNumber");

-- CreateIndex
CREATE INDEX "Payment_organizationId_createdAt_idx" ON "public"."Payment"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_subscriptionId_idx" ON "public"."Payment"("subscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_organizationId_key" ON "public"."Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Subscription_status_idx" ON "public"."Subscription"("status");

-- CreateIndex
CREATE INDEX "Subscription_planName_idx" ON "public"."Subscription"("planName");

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "public"."Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;
