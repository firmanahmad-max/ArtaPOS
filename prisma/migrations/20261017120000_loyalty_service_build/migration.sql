-- AlterTable
ALTER TABLE "pc_builds" ADD COLUMN     "pointsDiscount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "point_entries" ADD COLUMN     "pcBuildId" TEXT,
ADD COLUMN     "serviceTicketId" TEXT;

-- AlterTable
ALTER TABLE "service_tickets" ADD COLUMN     "pointsDiscount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "pointsRedeemed" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "pointServiceMultiplier" INTEGER NOT NULL DEFAULT 2;

-- CreateIndex
CREATE INDEX "point_entries_saleId_idx" ON "point_entries"("saleId");

-- CreateIndex
CREATE INDEX "point_entries_serviceTicketId_idx" ON "point_entries"("serviceTicketId");

-- CreateIndex
CREATE INDEX "point_entries_pcBuildId_idx" ON "point_entries"("pcBuildId");

