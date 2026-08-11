-- AlterTable
ALTER TABLE "sales" ADD COLUMN "clientOpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "sales_tenantId_clientOpId_key" ON "sales"("tenantId", "clientOpId");
