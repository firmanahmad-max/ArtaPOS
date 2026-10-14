-- CreateEnum
CREATE TYPE "ConsignmentCommissionType" AS ENUM ('PERCENT', 'FIXED');

-- AlterTable
ALTER TABLE "consignment_items" ADD COLUMN     "commissionType" "ConsignmentCommissionType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "commissionValue" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "ownerPaidAt" TIMESTAMP(3),
ADD COLUMN     "ownerShare" INTEGER,
ADD COLUMN     "saleId" TEXT,
ADD COLUMN     "storeCommission" INTEGER;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "consignmentItemId" TEXT;

-- CreateIndex
CREATE INDEX "sale_items_consignmentItemId_idx" ON "sale_items"("consignmentItemId");
