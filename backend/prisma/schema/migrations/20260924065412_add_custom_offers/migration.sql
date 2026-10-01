-- CreateEnum
CREATE TYPE "public"."RoleName" AS ENUM ('SUPER_ADMIN', 'BRAND_OWNER', 'BRAND_TEAM_MEMBER', 'INFLUENCER', 'AGENCY', 'SHOPPER');

-- CreateEnum
CREATE TYPE "public"."SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'CANCELLED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "public"."PaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."OrderStatus" AS ENUM ('PENDING', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "public"."JoinRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TeamMemberStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'REMOVED');

-- CreateEnum
CREATE TYPE "public"."AgencyClientStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED', 'AT_RISK');

-- CreateEnum
CREATE TYPE "public"."AgencyTaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'DONE', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."InfluencerPlatform" AS ENUM ('INSTAGRAM', 'TIKTOK', 'YOUTUBE', 'FACEBOOK', 'PINTEREST', 'LINKEDIN', 'SNAPCHAT', 'TWITTER', 'THREADS', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."InfluencerStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "public"."InfluencerAvailability" AS ENUM ('AVAILABLE', 'BOOKED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "public"."OfferStatus" AS ENUM ('DRAFT', 'PENDING_ADMIN', 'ADMIN_APPROVED', 'ADMIN_REJECTED', 'INFLUENCER_ACCEPTED', 'INFLUENCER_DECLINED', 'EXPIRED', 'CANCELLED');

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

-- CreateTable
CREATE TABLE "public"."Brand" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "website" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "brandVoice" TEXT,
    "brandStyle" TEXT,
    "targetAge" TEXT,
    "targetGender" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

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

-- CreateTable
CREATE TABLE "public"."BrandJoinRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "status" "public"."JoinRequestStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "requestedRoleId" TEXT,
    "approvedRoleId" TEXT,
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
    "teamRoleId" TEXT,
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

-- CreateTable
CREATE TABLE "public"."Cart" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CartItem" (
    "id" TEXT NOT NULL,
    "cartId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Order" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "public"."OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Influencer" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "displayName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "city" TEXT,
    "language" TEXT,
    "gender" TEXT,
    "ageGroup" TEXT,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categories" TEXT[],
    "audienceFavorites" TEXT[],
    "avgViews" INTEGER NOT NULL DEFAULT 0,
    "avgLikes" INTEGER NOT NULL DEFAULT 0,
    "avgComments" INTEGER NOT NULL DEFAULT 0,
    "pricePerPost" DECIMAL(10,2),
    "minBudget" DECIMAL(10,2),
    "acceptsBundles" BOOLEAN,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "availability" "public"."InfluencerAvailability" NOT NULL DEFAULT 'AVAILABLE',
    "status" "public"."InfluencerStatus" NOT NULL DEFAULT 'ACTIVE',
    "pricingTiers" JSONB,
    "portfolio" JSONB,
    "fashionScore" DOUBLE PRECISION,
    "luxuryScore" DOUBLE PRECISION,
    "beautyScore" DOUBLE PRECISION,
    "lifestyleScore" DOUBLE PRECISION,
    "profileCompleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Influencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InfluencerSocialAccount" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "platform" "public"."InfluencerPlatform" NOT NULL,
    "platformCustom" TEXT,
    "handle" TEXT NOT NULL,
    "profileUrl" TEXT,
    "followerCount" INTEGER NOT NULL DEFAULT 0,
    "followingCount" INTEGER NOT NULL DEFAULT 0,
    "engagementRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerSocialAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InfluencerAudienceMetrics" (
    "id" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "ageDistribution" JSONB,
    "genderDistribution" JSONB,
    "topCountries" JSONB,
    "interests" TEXT[],
    "audienceQuality" DOUBLE PRECISION,
    "fakeFollowerPct" DOUBLE PRECISION,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InfluencerAudienceMetrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."OrganizationInfluencer" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,

    CONSTRAINT "OrganizationInfluencer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CustomOffer" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "title" TEXT,
    "items" JSONB NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discountPct" DOUBLE PRECISION NOT NULL,
    "discountAmount" DECIMAL(12,2) NOT NULL,
    "adminFeePct" DOUBLE PRECISION NOT NULL,
    "adminFee" DECIMAL(12,2) NOT NULL,
    "total" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "public"."OfferStatus" NOT NULL DEFAULT 'DRAFT',
    "brandNote" TEXT,
    "adminNote" TEXT,
    "influencerNote" TEXT,
    "createdBy" TEXT NOT NULL,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "country" TEXT,
    "currency" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Team" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."TeamMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Product" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "price" DECIMAL(65,30),
    "currency" TEXT,
    "gender" TEXT,
    "season" TEXT,
    "occasion" TEXT,
    "inventory" INTEGER,
    "aiContent" JSONB,
    "aiAnalysis" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductImage" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Subscription" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" "public"."SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "externalId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Payment" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL,
    "status" "public"."PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "provider" TEXT NOT NULL DEFAULT 'stripe',
    "externalId" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Role" (
    "id" TEXT NOT NULL,
    "name" "public"."RoleName" NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Permission" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "permissionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
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

-- CreateIndex
CREATE INDEX "Brand_organizationId_idx" ON "public"."Brand"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_organizationId_slug_key" ON "public"."Brand"("organizationId", "slug");

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
CREATE INDEX "BrandJoinRequest_brandId_status_idx" ON "public"."BrandJoinRequest"("brandId", "status");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_userId_idx" ON "public"."BrandJoinRequest"("userId");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_requestedRoleId_idx" ON "public"."BrandJoinRequest"("requestedRoleId");

-- CreateIndex
CREATE INDEX "BrandJoinRequest_approvedRoleId_idx" ON "public"."BrandJoinRequest"("approvedRoleId");

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

-- CreateIndex
CREATE INDEX "BrandInvitation_teamRoleId_idx" ON "public"."BrandInvitation"("teamRoleId");

-- CreateIndex
CREATE UNIQUE INDEX "Cart_userId_key" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "Cart_userId_idx" ON "public"."Cart"("userId");

-- CreateIndex
CREATE INDEX "CartItem_cartId_idx" ON "public"."CartItem"("cartId");

-- CreateIndex
CREATE INDEX "CartItem_productId_idx" ON "public"."CartItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "CartItem_cartId_productId_key" ON "public"."CartItem"("cartId", "productId");

-- CreateIndex
CREATE INDEX "Order_userId_idx" ON "public"."Order"("userId");

-- CreateIndex
CREATE INDEX "Order_status_idx" ON "public"."Order"("status");

-- CreateIndex
CREATE INDEX "OrderItem_orderId_idx" ON "public"."OrderItem"("orderId");

-- CreateIndex
CREATE INDEX "OrderItem_productId_idx" ON "public"."OrderItem"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_userId_key" ON "public"."Influencer"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_username_key" ON "public"."Influencer"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Influencer_slug_key" ON "public"."Influencer"("slug");

-- CreateIndex
CREATE INDEX "Influencer_slug_idx" ON "public"."Influencer"("slug");

-- CreateIndex
CREATE INDEX "Influencer_status_idx" ON "public"."Influencer"("status");

-- CreateIndex
CREATE INDEX "Influencer_country_idx" ON "public"."Influencer"("country");

-- CreateIndex
CREATE INDEX "Influencer_availability_idx" ON "public"."Influencer"("availability");

-- CreateIndex
CREATE INDEX "Influencer_followerCount_idx" ON "public"."Influencer"("followerCount");

-- CreateIndex
CREATE INDEX "Influencer_engagementRate_idx" ON "public"."Influencer"("engagementRate");

-- CreateIndex
CREATE INDEX "InfluencerSocialAccount_influencerId_idx" ON "public"."InfluencerSocialAccount"("influencerId");

-- CreateIndex
CREATE INDEX "InfluencerSocialAccount_platform_idx" ON "public"."InfluencerSocialAccount"("platform");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerSocialAccount_influencerId_platform_handle_key" ON "public"."InfluencerSocialAccount"("influencerId", "platform", "handle");

-- CreateIndex
CREATE UNIQUE INDEX "InfluencerAudienceMetrics_influencerId_key" ON "public"."InfluencerAudienceMetrics"("influencerId");

-- CreateIndex
CREATE INDEX "OrganizationInfluencer_organizationId_idx" ON "public"."OrganizationInfluencer"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationInfluencer_influencerId_idx" ON "public"."OrganizationInfluencer"("influencerId");

-- CreateIndex
CREATE UNIQUE INDEX "OrganizationInfluencer_organizationId_influencerId_key" ON "public"."OrganizationInfluencer"("organizationId", "influencerId");

-- CreateIndex
CREATE INDEX "CustomOffer_brandId_status_idx" ON "public"."CustomOffer"("brandId", "status");

-- CreateIndex
CREATE INDEX "CustomOffer_influencerId_status_idx" ON "public"."CustomOffer"("influencerId", "status");

-- CreateIndex
CREATE INDEX "CustomOffer_status_createdAt_idx" ON "public"."CustomOffer"("status", "createdAt");

-- CreateIndex
CREATE INDEX "CustomOffer_createdBy_idx" ON "public"."CustomOffer"("createdBy");

-- CreateIndex
CREATE INDEX "CustomOffer_reviewedBy_idx" ON "public"."CustomOffer"("reviewedBy");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "public"."Organization"("slug");

-- CreateIndex
CREATE INDEX "Team_organizationId_idx" ON "public"."Team"("organizationId");

-- CreateIndex
CREATE INDEX "TeamMember_userId_idx" ON "public"."TeamMember"("userId");

-- CreateIndex
CREATE INDEX "TeamMember_teamId_idx" ON "public"."TeamMember"("teamId");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_userId_teamId_key" ON "public"."TeamMember"("userId", "teamId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "public"."Product"("brandId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_brandId_sku_key" ON "public"."Product"("brandId", "sku");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "public"."ProductImage"("productId");

-- CreateIndex
CREATE INDEX "Subscription_organizationId_idx" ON "public"."Subscription"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_organizationId_idx" ON "public"."Payment"("organizationId");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "public"."Payment"("status");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE INDEX "User_organizationId_idx" ON "public"."User"("organizationId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "public"."Role"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Permission_name_key" ON "public"."Permission"("name");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "public"."UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "public"."UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "public"."UserRole"("userId", "roleId");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "public"."RolePermission"("roleId");

-- CreateIndex
CREATE INDEX "RolePermission_permissionId_idx" ON "public"."RolePermission"("permissionId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key" ON "public"."RolePermission"("roleId", "permissionId");

-- AddForeignKey
ALTER TABLE "public"."AgencyClient" ADD CONSTRAINT "AgencyClient_agencyOrganizationId_fkey" FOREIGN KEY ("agencyOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyClient" ADD CONSTRAINT "AgencyClient_clientOrganizationId_fkey" FOREIGN KEY ("clientOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyTask" ADD CONSTRAINT "AgencyTask_agencyClientId_fkey" FOREIGN KEY ("agencyClientId") REFERENCES "public"."AgencyClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Brand" ADD CONSTRAINT "Brand_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

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
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_requestedRoleId_fkey" FOREIGN KEY ("requestedRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandJoinRequest" ADD CONSTRAINT "BrandJoinRequest_approvedRoleId_fkey" FOREIGN KEY ("approvedRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_acceptedBy_fkey" FOREIGN KEY ("acceptedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BrandInvitation" ADD CONSTRAINT "BrandInvitation_teamRoleId_fkey" FOREIGN KEY ("teamRoleId") REFERENCES "public"."BrandTeamRole"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "public"."Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CartItem" ADD CONSTRAINT "CartItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Order" ADD CONSTRAINT "Order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "public"."Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Influencer" ADD CONSTRAINT "Influencer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfluencerSocialAccount" ADD CONSTRAINT "InfluencerSocialAccount_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InfluencerAudienceMetrics" ADD CONSTRAINT "InfluencerAudienceMetrics_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInfluencer" ADD CONSTRAINT "OrganizationInfluencer_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."OrganizationInfluencer" ADD CONSTRAINT "OrganizationInfluencer_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Team" ADD CONSTRAINT "Team_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "public"."Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Product" ADD CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "public"."Brand"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductImage" ADD CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Payment" ADD CONSTRAINT "Payment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "public"."Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
