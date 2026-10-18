-- AlterTable
ALTER TABLE "daily_content_items" ADD COLUMN     "productId" TEXT,
ADD COLUMN     "promoPrice" INTEGER;

-- AddForeignKey
ALTER TABLE "daily_content_items" ADD CONSTRAINT "daily_content_items_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;
