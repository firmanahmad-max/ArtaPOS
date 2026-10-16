-- CreateEnum
CREATE TYPE "LinkVisitKind" AS ENUM ('LACAK_OPEN', 'GALLERY_FROM_LACAK', 'GALLERY_FROM_RECEIPT', 'GALLERY_FROM_CONSIGNMENT');

-- CreateTable
CREATE TABLE "link_visit_stats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "kind" "LinkVisitKind" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "link_visit_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "link_visit_stats_tenantId_day_kind_key" ON "link_visit_stats"("tenantId", "day", "kind");

-- AddForeignKey
ALTER TABLE "link_visit_stats" ADD CONSTRAINT "link_visit_stats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

