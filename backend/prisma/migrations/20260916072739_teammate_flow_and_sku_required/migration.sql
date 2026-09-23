/*
  Warnings:

  - Made the column `sku` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "public"."JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- AlterTable
ALTER TABLE "public"."Product" ALTER COLUMN "sku" SET NOT NULL;

-- CreateTable
CREATE TABLE "public"."BrandJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "status" "public"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandJoinRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BrandInvitation" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "invitedById" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "public"."RoleName" NOT NULL DEFAULT 'BRAND_TEAM_MEMBER',
    "token" TEXT NOT NULL,
    "status" "public"."InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandJoinRequest_brandId_status_idx" ON "public"."BrandJoinRequest"("brandId", "status");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_userId_idx" ON "public"."BrandJoinRequest"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandJoinRequest_userId_brandId_key" ON "public"."BrandJoinRequest"("userId", "brandId");

-- CreateIndex
CREATE UNIQUE INDEX "BrandInvitation_token_key" ON "public"."BrandInvitation"("token");

-- CreateIndex
CREATE INDEX "BrandInvitation_email_status_idx" ON "public"."BrandInvitation"("email", "status");

-- CreateIndex
CREATE INDEX "BrandInvitation_brandId_status_idx" ON "public"."BrandInvitation"("brandId", "status");

-- CreateIndex
CREATE INDEX "BrandInvitation_token_idx" ON "public"."BrandInvitation"("token");

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
