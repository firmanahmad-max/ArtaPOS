-- CreateEnum
CREATE TYPE "ReportKind" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateEnum
CREATE TYPE "ReportDispatchStatus" AS ENUM ('SENT', 'SKIPPED');

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "reportDaily" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportDailyHour" INTEGER NOT NULL DEFAULT 21,
ADD COLUMN     "reportMonthly" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "reportPhone" TEXT,
ADD COLUMN     "reportWeekly" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "report_dispatches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "ReportKind" NOT NULL,
    "periodKey" TEXT NOT NULL,
    "status" "ReportDispatchStatus" NOT NULL,
    "actedById" TEXT,
    "actedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_dispatches_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "report_dispatches_tenantId_actedAt_idx" ON "report_dispatches"("tenantId", "actedAt");

-- CreateIndex
CREATE UNIQUE INDEX "report_dispatches_tenantId_kind_periodKey_key" ON "report_dispatches"("tenantId", "kind", "periodKey");

-- AddForeignKey
ALTER TABLE "report_dispatches" ADD CONSTRAINT "report_dispatches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
