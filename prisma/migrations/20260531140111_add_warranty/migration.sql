-- CreateEnum
CREATE TYPE "WarrantyStatus" AS ENUM ('ACTIVE', 'CLAIMED', 'VOID');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "warrantyMonths" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "warranty_units" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "saleId" TEXT,
    "saleNumber" TEXT,
    "customerId" TEXT,
    "customerName" TEXT,
    "soldAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "warrantyMonths" INTEGER NOT NULL DEFAULT 0,
    "warrantyUntil" TIMESTAMP(3),
    "status" "WarrantyStatus" NOT NULL DEFAULT 'ACTIVE',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "warranty_units_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "warranty_units_tenantId_idx" ON "warranty_units"("tenantId");

-- CreateIndex
CREATE INDEX "warranty_units_tenantId_customerName_idx" ON "warranty_units"("tenantId", "customerName");

-- CreateIndex
CREATE UNIQUE INDEX "warranty_units_tenantId_serialNumber_key" ON "warranty_units"("tenantId", "serialNumber");

-- AddForeignKey
ALTER TABLE "warranty_units" ADD CONSTRAINT "warranty_units_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
