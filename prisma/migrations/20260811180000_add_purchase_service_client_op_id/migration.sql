-- AlterTable
ALTER TABLE "purchases" ADD COLUMN "clientOpId" TEXT;
ALTER TABLE "service_tickets" ADD COLUMN "clientOpId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "purchases_tenantId_clientOpId_key" ON "purchases"("tenantId", "clientOpId");
CREATE UNIQUE INDEX "service_tickets_tenantId_clientOpId_key" ON "service_tickets"("tenantId", "clientOpId");
