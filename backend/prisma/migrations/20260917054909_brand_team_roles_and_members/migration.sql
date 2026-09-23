-- CreateEnum
CREATE TYPE "public"."TeamMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- AlterTable
ALTER TABLE "public"."BrandInvitation" ADD COLUMN     "teamRoleId" TEXT;

-- AlterTable
ALTER TABLE "public"."BrandJoinRequest" ADD COLUMN     "approvedRoleId" TEXT,
ADD COLUMN     "requestedRoleId" TEXT;

-- CreateTable
CREATE TABLE "public"."BrandTeamRole" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" JSONB NOT NULL,
    "color" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isOwnerRole" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandTeamRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BrandTeamMember" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamRoleId" TEXT NOT NULL,
    "status" "public"."TeamMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "invitedBy" TEXT,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BrandTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BrandTeamRole_brandId_idx" ON "public"."BrandTeamRole"("brandId");

-- CreateIndex
CREATE INDEX "BrandTeamRole_isDefault_idx" ON "public"."BrandTeamRole"("isDefault");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTeamRole_brandId_name_key" ON "public"."BrandTeamRole"("brandId", "name");

-- CreateIndex
CREATE INDEX "BrandTeamMember_brandId_idx" ON "public"."BrandTeamMember"("brandId");

-- CreateIndex
CREATE INDEX "BrandTeamMember_userId_idx" ON "public"."BrandTeamMember"("userId");

-- CreateIndex
CREATE INDEX "BrandTeamMember_teamRoleId_idx" ON "public"."BrandTeamMember"("teamRoleId");

-- CreateIndex
CREATE INDEX "BrandTeamMember_status_idx" ON "public"."BrandTeamMember"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BrandTeamMember_brandId_userId_key" ON "public"."BrandTeamMember"("brandId", "userId");

-- CreateIndex
CREATE INDEX "BrandInvitation_teamRoleId_idx" ON "public"."BrandInvitation"("teamRoleId");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_requestedRoleId_idx" ON "public"."BrandJoinRequest"("requestedRoleId");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_approvedRoleId_idx" ON "public"."BrandJoinRequest"("approvedRoleId");

-- AddForeignKey
ALTER TABLE "public"."BrandTeamRole" ADD CONSTRAINT "BrandTeamRole_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandTeamMember" ADD CONSTRAINT "BrandTeamMember_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandTeamMember" ADD CONSTRAINT "BrandTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandTeamMember" ADD CONSTRAINT "BrandTeamMember_teamRoleId_fkey" FOREIGN KEY ("teamRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandTeamMember" ADD CONSTRAINT "BrandTeamMember_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_requestedRoleId_fkey" FOREIGN KEY ("requestedRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_approvedRoleId_fkey" FOREIGN KEY ("approvedRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_teamRoleId_fkey" FOREIGN KEY ("teamRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;
