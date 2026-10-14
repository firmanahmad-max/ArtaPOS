-- CreateEnum
CREATE TYPE "ConsignmentItemStatus" AS ENUM ('AVAILABLE', 'SOLD', 'RETURNED');

-- CreateTable
CREATE TABLE "consignments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerPhone" TEXT,
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consignment_items" (
    "id" TEXT NOT NULL,
    "consignmentId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "serialNumber" TEXT,
    "condition" TEXT,
    "askingPrice" INTEGER NOT NULL,
    "status" "ConsignmentItemStatus" NOT NULL DEFAULT 'AVAILABLE',
    "soldPrice" INTEGER,
    "statusAt" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "consignment_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consignments_tenantId_idx" ON "consignments"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "consignments_tenantId_number_key" ON "consignments"("tenantId", "number");

-- CreateIndex
CREATE INDEX "consignment_items_consignmentId_idx" ON "consignment_items"("consignmentId");

-- AddForeignKey
ALTER TABLE "consignments" ADD CONSTRAINT "consignments_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consignment_items" ADD CONSTRAINT "consignment_items_consignmentId_fkey" FOREIGN KEY ("consignmentId") REFERENCES "consignments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
