-- AlterTable
ALTER TABLE "gallery_items" ADD COLUMN "consignmentItemId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "gallery_items_consignmentItemId_key" ON "gallery_items"("consignmentItemId");

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_consignmentItemId_fkey" FOREIGN KEY ("consignmentItemId") REFERENCES "consignment_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;
