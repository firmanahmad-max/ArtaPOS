-- CreateEnum
CREATE TYPE "DailyContentAction" AS ENUM ('SHARE', 'DOWNLOAD', 'COPY');

-- CreateTable
CREATE TABLE "daily_content_stats" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "contentKey" TEXT NOT NULL,
    "kind" "DailyContentKind" NOT NULL,
    "isCustom" BOOLEAN NOT NULL,
    "title" TEXT NOT NULL,
    "action" "DailyContentAction" NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "daily_content_stats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_content_stats_tenantId_day_idx" ON "daily_content_stats"("tenantId", "day");

-- CreateIndex
CREATE UNIQUE INDEX "daily_content_stats_tenantId_day_contentKey_action_key" ON "daily_content_stats"("tenantId", "day", "contentKey", "action");

-- AddForeignKey
ALTER TABLE "daily_content_stats" ADD CONSTRAINT "daily_content_stats_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
