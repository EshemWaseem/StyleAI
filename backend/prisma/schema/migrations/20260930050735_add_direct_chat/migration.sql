-- CreateTable
CREATE TABLE "public"."Conversation" (
    "id" TEXT NOT NULL,
    "brandOrganizationId" TEXT NOT NULL,
    "influencerId" TEXT NOT NULL,
    "lastMessageAt" TIMESTAMP(3),
    "lastMessageBody" TEXT,
    "lastSenderUserId" TEXT,
    "unreadForBrand" INTEGER NOT NULL DEFAULT 0,
    "unreadForInfluencer" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DirectMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "senderUserId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "attachments" JSONB,
    "readByBrand" BOOLEAN NOT NULL DEFAULT false,
    "readByInfluencer" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_brandOrganizationId_lastMessageAt_idx" ON "public"."Conversation"("brandOrganizationId", "lastMessageAt");

-- CreateIndex
CREATE INDEX "Conversation_influencerId_lastMessageAt_idx" ON "public"."Conversation"("influencerId", "lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_brandOrganizationId_influencerId_key" ON "public"."Conversation"("brandOrganizationId", "influencerId");

-- CreateIndex
CREATE INDEX "DirectMessage_conversationId_createdAt_idx" ON "public"."DirectMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "DirectMessage_senderUserId_idx" ON "public"."DirectMessage"("senderUserId");

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_brandOrganizationId_fkey" FOREIGN KEY ("brandOrganizationId") REFERENCES "public"."Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Conversation" ADD CONSTRAINT "Conversation_influencerId_fkey" FOREIGN KEY ("influencerId") REFERENCES "public"."Influencer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "public"."Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DirectMessage" ADD CONSTRAINT "DirectMessage_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
