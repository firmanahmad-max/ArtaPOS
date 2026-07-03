-- CreateEnum
CREATE TYPE "RmaStatus" AS ENUM ('SENT', 'RETURNED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RmaResolution" AS ENUM ('REPAIRED', 'REPLACED', 'REFUNDED');

-- CreateTable
CREATE TABLE "rma_claims" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "serialNumber" TEXT,
    "complaint" TEXT NOT NULL,
    "supplierId" TEXT,
    "supplierName" TEXT NOT NULL,
    "trackingNumber" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "receivedAt" TIMESTAMP(3),
    "status" "RmaStatus" NOT NULL DEFAULT 'SENT',
    "resolution" "RmaResolution",
    "replacementSn" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rma_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rma_photos" (
    "id" TEXT NOT NULL,
    "rmaId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rma_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rma_claims_tenantId_idx" ON "rma_claims"("tenantId");

-- CreateIndex
CREATE INDEX "rma_claims_tenantId_status_idx" ON "rma_claims"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "rma_claims_tenantId_number_key" ON "rma_claims"("tenantId", "number");

-- CreateIndex
CREATE INDEX "rma_photos_rmaId_idx" ON "rma_photos"("rmaId");

-- AddForeignKey
ALTER TABLE "rma_claims" ADD CONSTRAINT "rma_claims_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rma_photos" ADD CONSTRAINT "rma_photos_rmaId_fkey" FOREIGN KEY ("rmaId") REFERENCES "rma_claims"("id") ON DELETE CASCADE ON UPDATE CASCADE;
