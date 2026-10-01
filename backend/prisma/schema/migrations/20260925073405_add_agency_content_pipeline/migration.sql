-- CreateEnum
CREATE TYPE "public"."SubmissionStage" AS ENUM ('RAW', 'FINAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'RAW_UPLOADED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'AGENCY_EDITING';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'FINAL_UPLOADED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'BRAND_REVIEW';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'BRAND_APPROVED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'BRAND_REJECTED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'PUBLISHED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'METRICS_ENTERED';
ALTER TYPE "public"."DeliverableStatus" ADD VALUE 'COMPLETED';

-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "agencyId" TEXT;

-- AlterTable
ALTER TABLE "public"."ContentSubmission" ADD COLUMN     "stage" "public"."SubmissionStage" NOT NULL DEFAULT 'RAW',
ADD COLUMN     "submittedByAgencyId" TEXT,
ADD COLUMN     "submittedByRole" TEXT;

-- AlterTable
ALTER TABLE "public"."CustomOffer" ADD COLUMN     "createdByAgencyId" TEXT;

-- CreateTable
CREATE TABLE "public"."ContentPublish" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "postUrl" TEXT NOT NULL,
    "postId" TEXT,
    "postedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "postedByUserId" TEXT NOT NULL,
    "postedByAgencyId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentPublish_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DeliverableMetric" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "likes" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "source" TEXT NOT NULL DEFAULT 'MANUAL',
    "enteredByUserId" TEXT NOT NULL,
    "enteredByAgencyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DeliverableMetric_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ContentPublish_deliverableId_idx" ON "public"."ContentPublish"("deliverableId");

-- CreateIndex
CREATE INDEX "ContentPublish_postedByAgencyId_idx" ON "public"."ContentPublish"("postedByAgencyId");

-- CreateIndex
CREATE INDEX "DeliverableMetric_deliverableId_createdAt_idx" ON "public"."DeliverableMetric"("deliverableId", "createdAt");

-- CreateIndex
CREATE INDEX "DeliverableMetric_enteredByAgencyId_idx" ON "public"."DeliverableMetric"("enteredByAgencyId");

-- CreateIndex
CREATE INDEX "Campaign_productId_idx" ON "public"."Campaign"("productId");

-- CreateIndex
CREATE INDEX "Campaign_agencyId_idx" ON "public"."Campaign"("agencyId");

-- CreateIndex
CREATE INDEX "ContentSubmission_stage_idx" ON "public"."ContentSubmission"("stage");

-- CreateIndex
CREATE INDEX "ContentSubmission_submittedByAgencyId_idx" ON "public"."ContentSubmission"("submittedByAgencyId");

-- CreateIndex
CREATE INDEX "CustomOffer_productId_idx" ON "public"."CustomOffer"("productId");

-- CreateIndex
CREATE INDEX "CustomOffer_createdByAgencyId_idx" ON "public"."CustomOffer"("createdByAgencyId");

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentSubmission" ADD CONSTRAINT "ContentSubmission_submittedByAgencyId_fkey" FOREIGN KEY ("submittedByAgencyId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentPublish" ADD CONSTRAINT "ContentPublish_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."CampaignDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentPublish" ADD CONSTRAINT "ContentPublish_postedByAgencyId_fkey" FOREIGN KEY ("postedByAgencyId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliverableMetric" ADD CONSTRAINT "DeliverableMetric_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."CampaignDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DeliverableMetric" ADD CONSTRAINT "DeliverableMetric_enteredByAgencyId_fkey" FOREIGN KEY ("enteredByAgencyId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_createdByAgencyId_fkey" FOREIGN KEY ("createdByAgencyId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
