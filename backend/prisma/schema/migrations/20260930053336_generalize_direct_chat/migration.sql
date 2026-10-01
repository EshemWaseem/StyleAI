/*
  Warnings:

  - You are about to drop the column `brandOrganizationId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `influencerId` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `unreadForBrand` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `unreadForInfluencer` on the `Conversation` table. All the data in the column will be lost.
  - You are about to drop the column `readByBrand` on the `DirectMessage` table. All the data in the column will be lost.
  - You are about to drop the column `readByInfluencer` on the `DirectMessage` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[partyAType,partyAId,partyBType,partyBId]` on the table `Conversation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `partyAId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyAType` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyBId` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `partyBType` to the `Conversation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderPartyId` to the `DirectMessage` table without a default value. This is not possible if the table is not empty.
  - Added the required column `senderPartyType` to the `DirectMessage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_brandOrganizationId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Conversation" DROP CONSTRAINT "Conversation_influencerId_fkey";

-- DropIndex
DROP INDEX "public"."Conversation_brandOrganizationId_influencerId_key";

-- DropIndex
DROP INDEX "public"."Conversation_brandOrganizationId_lastMessageAt_idx";

-- DropIndex
DROP INDEX "public"."Conversation_influencerId_lastMessageAt_idx";

-- AlterTable
ALTER TABLE "public"."Conversation" DROP COLUMN "brandOrganizationId",
DROP COLUMN "influencerId",
DROP COLUMN "unreadForBrand",
DROP COLUMN "unreadForInfluencer",
ADD COLUMN     "contextType" TEXT NOT NULL DEFAULT 'DIRECT',
ADD COLUMN     "partyAId" TEXT NOT NULL,
ADD COLUMN     "partyAType" TEXT NOT NULL,
ADD COLUMN     "partyBId" TEXT NOT NULL,
ADD COLUMN     "partyBType" TEXT NOT NULL,
ADD COLUMN     "unreadForA" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "unreadForB" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "public"."DirectMessage" DROP COLUMN "readByBrand",
DROP COLUMN "readByInfluencer",
ADD COLUMN     "readByA" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "readByB" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "senderPartyId" TEXT NOT NULL,
ADD COLUMN     "senderPartyType" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Conversation_partyAType_partyAId_lastMessageAt_idx" ON "public"."Conversation"("partyAType", "partyAId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_partyBType_partyBId_lastMessageAt_idx" ON "public"."Conversation"("partyBType", "partyBId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_partyAType_partyAId_partyBType_partyBId_key" ON "public"."Conversation"("partyAType", "partyAId", "partyBType", "partyBId");
