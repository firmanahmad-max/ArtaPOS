-- CreateEnum
CREATE TYPE "BuildStatus" AS ENUM ('DRAFT', 'ASSEMBLING', 'DONE', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'BUILD_OUT';

-- CreateTable
CREATE TABLE "pc_builds" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "status" "BuildStatus" NOT NULL DEFAULT 'DRAFT',
    "buildFee" INTEGER NOT NULL DEFAULT 0,
    "componentsCost" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "pc_builds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pc_build_items" (
    "id" TEXT NOT NULL,
    "buildId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,

    CONSTRAINT "pc_build_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "pc_builds_tenantId_idx" ON "pc_builds"("tenantId");

-- CreateIndex
CREATE INDEX "pc_builds_tenantId_status_idx" ON "pc_builds"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pc_builds_tenantId_number_key" ON "pc_builds"("tenantId", "number");

-- CreateIndex
CREATE INDEX "pc_build_items_buildId_idx" ON "pc_build_items"("buildId");

-- AddForeignKey
ALTER TABLE "pc_builds" ADD CONSTRAINT "pc_builds_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pc_build_items" ADD CONSTRAINT "pc_build_items_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "pc_builds"("id") ON DELETE CASCADE ON UPDATE CASCADE;
