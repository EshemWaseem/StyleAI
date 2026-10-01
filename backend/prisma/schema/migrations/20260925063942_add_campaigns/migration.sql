-- CreateEnum
CREATE TYPE "public"."CampaignStatus" AS ENUM ('ACTIVE', 'IN_REVIEW', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'DISPUTED');

-- CreateEnum
CREATE TYPE "public"."DeliverableStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUBMITTED', 'APPROVED', 'CHANGES_REQUESTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUESTED');

-- CreateTable
CREATE TABLE "public"."Campaign" (
    "id" TEXT NOT NULL,
    "offerId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL,
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "brief" TEXT,
    "hashtags" TEXT[],
    "mentions" TEXT[],
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" "public"."CampaignStatus" NOT NULL DEFAULT 'ACTIVE',
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignDeliverable" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" "public"."DeliverableStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignDeliverable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ContentSubmission" (
    "id" TEXT NOT NULL,
    "deliverableId" TEXT NOT NULL,
    "files" JSONB NOT NULL,
    "caption" TEXT,
    "notes" TEXT,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "feedback" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "submittedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignMessage" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "readByBrand" BOOLEAN NOT NULL DEFAULT false,
    "readByInfluencer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT,

    CONSTRAINT "CampaignMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CampaignMetricSnapshot" (
    "id" TEXT NOT NULL,
    "campaignId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reach" INTEGER NOT NULL DEFAULT 0,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "conversions" INTEGER NOT NULL DEFAULT 0,
    "revenue" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignMetricSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Campaign_offerId_key" ON "public"."Campaign"("offerId");

-- CreateIndex
CREATE INDEX "Campaign_brandId_status_idx" ON "public"."Campaign"("brandId", "status");

-- CreateIndex
CREATE INDEX "Campaign_influencerId_status_idx" ON "public"."Campaign"("influencerId", "status");

-- CreateIndex
CREATE INDEX "Campaign_status_createdAt_idx" ON "public"."Campaign"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignDeliverable_campaignId_status_idx" ON "public"."CampaignDeliverable"("campaignId", "status");

-- CreateIndex
CREATE INDEX "ContentSubmission_deliverableId_status_idx" ON "public"."ContentSubmission"("deliverableId", "status");

-- CreateIndex
CREATE INDEX "CampaignMessage_campaignId_createdAt_idx" ON "public"."CampaignMessage"("campaignId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignMetricSnapshot_campaignId_date_idx" ON "public"."CampaignMetricSnapshot"("campaignId", "date");

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_offerId_fkey" FOREIGN KEY ("offerId") REFERENCES "public"."CustomOffer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignDeliverable" ADD CONSTRAINT "CampaignDeliverable_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ContentSubmission" ADD CONSTRAINT "ContentSubmission_deliverableId_fkey" FOREIGN KEY ("deliverableId") REFERENCES "public"."CampaignDeliverable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMessage" ADD CONSTRAINT "CampaignMessage_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMessage" ADD CONSTRAINT "CampaignMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CampaignMetricSnapshot" ADD CONSTRAINT "CampaignMetricSnapshot_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "public"."Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
