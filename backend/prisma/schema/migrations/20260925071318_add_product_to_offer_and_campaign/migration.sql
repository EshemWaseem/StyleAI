-- AlterTable
ALTER TABLE "public"."Campaign" ADD COLUMN     "productId" TEXT;

-- AlterTable
ALTER TABLE "public"."CustomOffer" ADD COLUMN     "productId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."Campaign" ADD CONSTRAINT "Campaign_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CustomOffer" ADD CONSTRAINT "CustomOffer_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
