-- CreateEnum
CREATE TYPE "ServiceReminderStatus" AS ENUM ('REMINDED', 'SKIPPED');

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "phoneKey" TEXT,
ADD COLUMN     "waConsent" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "service_items" ADD COLUMN     "catalogItemId" TEXT;

-- CreateTable
CREATE TABLE "service_catalog_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price" INTEGER NOT NULL DEFAULT 0,
    "intervalMonths" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_catalog_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_reminders" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceTicketId" TEXT NOT NULL,
    "catalogItemId" TEXT NOT NULL,
    "status" "ServiceReminderStatus" NOT NULL,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actedById" TEXT,

    CONSTRAINT "service_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_catalog_items_tenantId_idx" ON "service_catalog_items"("tenantId");

-- CreateIndex
CREATE INDEX "service_reminders_tenantId_idx" ON "service_reminders"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "service_reminders_sourceTicketId_catalogItemId_key" ON "service_reminders"("sourceTicketId", "catalogItemId");

-- CreateIndex
CREATE INDEX "customers_tenantId_phoneKey_idx" ON "customers"("tenantId", "phoneKey");

-- CreateIndex
CREATE INDEX "service_items_catalogItemId_idx" ON "service_items"("catalogItemId");

-- AddForeignKey
ALTER TABLE "service_catalog_items" ADD CONSTRAINT "service_catalog_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_reminders" ADD CONSTRAINT "service_reminders_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Backfill: No. HP pelanggan ternormalisasi (62xxx) untuk pencocokan otomatis.
UPDATE "customers" SET "phoneKey" = CASE
  WHEN n.d LIKE '0%' THEN '62' || substr(n.d, 2)
  WHEN n.d LIKE '8%' THEN '62' || n.d
  ELSE n.d END
FROM (SELECT id AS cid, regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') AS d FROM "customers") AS n
WHERE "customers".id = n.cid AND length(n.d) >= 8;
