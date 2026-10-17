-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "portalToken" TEXT,
ADD COLUMN     "portalTokenAt" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "customers_portalToken_key" ON "customers"("portalToken");

