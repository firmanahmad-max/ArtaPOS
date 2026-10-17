-- CreateEnum
CREATE TYPE "DailyContentKind" AS ENUM ('MOTIVASI', 'TIPS', 'FAKTA', 'PROMO');

-- CreateTable
CREATE TABLE "daily_content_items" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "kind" "DailyContentKind" NOT NULL,
    "title" TEXT NOT NULL,
    "emphasis" TEXT,
    "body" TEXT NOT NULL,
    "steps" TEXT[],
    "cta" TEXT NOT NULL,
    "startsOn" DATE,
    "endsOn" DATE,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "daily_content_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "daily_content_items_tenantId_isActive_idx" ON "daily_content_items"("tenantId", "isActive");

-- AddForeignKey
ALTER TABLE "daily_content_items" ADD CONSTRAINT "daily_content_items_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
