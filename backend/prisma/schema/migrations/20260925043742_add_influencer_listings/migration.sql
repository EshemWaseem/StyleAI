-- CreateEnum
CREATE TYPE "public"."ListingStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'CANCELLED', 'CLAIMED');

-- CreateTable
CREATE TABLE "public"."InfluencerListing" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "coverImageUrl" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "validDays" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" "public"."ListingStatus" NOT NULL DEFAULT 'ACTIVE',
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "claimCount" INTEGER NOT NULL DEFAULT 0,
    "claimedByBrandId" TEXT,
    "claimedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerListing_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InfluencerListing_influencerId_status_idx" ON "public"."InfluencerListing"("influencerId", "status");

-- CreateIndex
CREATE INDEX "InfluencerListing_status_expiresAt_idx" ON "public"."InfluencerListing"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "InfluencerListing_claimedByBrandId_idx" ON "public"."InfluencerListing"("claimedByBrandId");

-- AddForeignKey
ALTER TABLE "public"."InfluencerListing" ADD CONSTRAINT "InfluencerListing_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
