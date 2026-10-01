/*
  Warnings:

  - You are about to drop the column `userId` on the `CampaignMessage` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."CampaignMessage" DROP CONSTRAINT "CampaignMessage_userId_fkey";

-- AlterTable
ALTER TABLE "public"."CampaignMessage" DROP COLUMN "userId",
ADD COLUMN     "readByAgency" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senderAgencyId" TEXT;

-- CreateIndex
CREATE INDEX "CampaignMessage_senderUserId_idx" ON "public"."CampaignMessage"("senderUserId");

-- CreateIndex
CREATE INDEX "CampaignMessage_senderAgencyId_idx" ON "public"."CampaignMessage"("senderAgencyId");

-- AddForeignKey
ALTER TABLE "public"."CampaignMessage" ADD CONSTRAINT "CampaignMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
