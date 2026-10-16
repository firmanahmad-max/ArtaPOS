-- CreateEnum
CREATE TYPE "UsedItemStatus" AS ENUM ('AVAILABLE', 'SOLD', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "UsedItemGrade" AS ENUM ('LIKE_NEW', 'GOOD', 'FAIR', 'POOR');

-- CreateEnum
CREATE TYPE "UsedItemSource" AS ENUM ('BUY', 'TRADE_IN', 'SUPPLIER', 'SERVICE', 'OTHER');

-- AlterTable
ALTER TABLE "gallery_items" ADD COLUMN     "usedItemId" TEXT;

-- AlterTable
ALTER TABLE "sale_items" ADD COLUMN     "usedItemId" TEXT;

-- CreateTable
CREATE TABLE "used_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "grade" "UsedItemGrade" NOT NULL DEFAULT 'GOOD',
    "condition" TEXT,
    "completeness" TEXT,
    "specs" TEXT,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL,
    "warrantyDays" INTEGER NOT NULL DEFAULT 0,
    "source" "UsedItemSource" NOT NULL DEFAULT 'BUY',
    "sourceName" TEXT,
    "sourcePhone" TEXT,
    "acquiredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "note" TEXT,
    "status" "UsedItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "soldPrice" INTEGER,
    "saleId" TEXT,
    "statusAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "used_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "used_items_tenantId_status_idx" ON "used_items"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "used_items_tenantId_number_key" ON "used_items"("tenantId", "number");

-- CreateIndex
CREATE UNIQUE INDEX "gallery_items_usedItemId_key" ON "gallery_items"("usedItemId");

-- CreateIndex
CREATE INDEX "sale_items_usedItemId_idx" ON "sale_items"("usedItemId");

-- AddForeignKey
ALTER TABLE "gallery_items" ADD CONSTRAINT "gallery_items_usedItemId_fkey" FOREIGN KEY ("usedItemId") REFERENCES "used_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "used_items" ADD CONSTRAINT "used_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

