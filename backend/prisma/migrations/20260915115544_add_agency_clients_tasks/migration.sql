-- CreateEnum
CREATE TYPE "public"."AgencyClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "public"."AgencyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateTable
CREATE TABLE "public"."AgencyClient" (
    "id" TEXT NOT NULL,
    "agencyOrganizationId" TEXT NOT NULL,
    "clientOrganizationId" TEXT NOT NULL,
    "status" "public"."AgencyClientStatus" NOT NULL DEFAULT 'ACTIVE',
    "contractStart" TIMESTAMP(3),
    "contractEnd" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyClient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AgencyTask" (
    "id" TEXT NOT NULL,
    "agencyClientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."AgencyTaskStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgencyClient_agencyOrganizationId_idx" ON "public"."AgencyClient"("agencyOrganizationId");

-- CreateIndex
CREATE INDEX "AgencyClient_clientOrganizationId_idx" ON "public"."AgencyClient"("clientOrganizationId");

-- CreateIndex
CREATE INDEX "AgencyClient_status_idx" ON "public"."AgencyClient"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyClient_agencyOrganizationId_clientOrganizationId_key" ON "public"."AgencyClient"("agencyOrganizationId", "clientOrganizationId");

-- CreateIndex
CREATE INDEX "AgencyTask_agencyClientId_idx" ON "public"."AgencyTask"("agencyClientId");

-- CreateIndex
CREATE INDEX "AgencyTask_status_idx" ON "public"."AgencyTask"("status");

-- AddForeignKey
ALTER TABLE "public"."AgencyClient" ADD CONSTRAINT "AgencyClient_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyClient" ADD CONSTRAINT "AgencyClient_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyTask" ADD CONSTRAINT "AgencyTask_agencyClientId_fkey" FOREIGN KEY ("agencyClientId") REFERENCES "public"."AgencyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
