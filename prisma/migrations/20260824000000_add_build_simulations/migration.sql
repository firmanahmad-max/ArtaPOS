-- CreateEnum
CREATE TYPE "SimStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'IMPORTED', 'REJECTED');

-- AlterTable: komponen rakit PC boleh non-inventory + tanda stok sudah dialokasikan
ALTER TABLE "pc_build_items" ALTER COLUMN "productId" DROP NOT NULL;
ALTER TABLE "pc_build_items" ADD COLUMN "stockApplied" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "build_simulations" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "budget" INTEGER NOT NULL DEFAULT 0,
    "buildFee" INTEGER NOT NULL DEFAULT 0,
    "status" "SimStatus" NOT NULL DEFAULT 'DRAFT',
    "note" TEXT,
    "importedBuildId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "build_simulations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "build_simulation_items" (
    "id" TEXT NOT NULL,
    "simulationId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "costPrice" INTEGER NOT NULL DEFAULT 0,
    "sellPrice" INTEGER NOT NULL DEFAULT 0,
    "subtotal" INTEGER NOT NULL DEFAULT 0,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "build_simulation_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "build_simulations_tenantId_idx" ON "build_simulations"("tenantId");

-- CreateIndex
CREATE INDEX "build_simulations_tenantId_status_idx" ON "build_simulations"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "build_simulations_tenantId_number_key" ON "build_simulations"("tenantId", "number");

-- CreateIndex
CREATE INDEX "build_simulation_items_simulationId_idx" ON "build_simulation_items"("simulationId");

-- AddForeignKey
ALTER TABLE "build_simulations" ADD CONSTRAINT "build_simulations_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "build_simulation_items" ADD CONSTRAINT "build_simulation_items_simulationId_fkey" FOREIGN KEY ("simulationId") REFERENCES "build_simulations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
