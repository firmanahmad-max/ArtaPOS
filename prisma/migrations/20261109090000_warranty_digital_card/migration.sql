-- AlterTable
ALTER TABLE "warranty_units" ADD COLUMN     "cardLastViewedAt" TIMESTAMP(3),
ADD COLUMN     "cardViews" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "publicToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "warranty_units_publicToken_key" ON "warranty_units"("publicToken");

