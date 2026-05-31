-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('RECEIVED', 'IN_PROGRESS', 'WAITING_PARTS', 'DONE', 'DELIVERED', 'CANCELLED');

-- AlterEnum
ALTER TYPE "StockMovementType" ADD VALUE 'SERVICE_OUT';

-- CreateTable
CREATE TABLE "service_tickets" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT,
    "customerPhone" TEXT,
    "deviceType" TEXT NOT NULL,
    "deviceBrand" TEXT,
    "deviceInfo" TEXT,
    "complaint" TEXT NOT NULL,
    "diagnosis" TEXT,
    "status" "ServiceStatus" NOT NULL DEFAULT 'RECEIVED',
    "technicianId" TEXT,
    "technicianName" TEXT,
    "laborCost" INTEGER NOT NULL DEFAULT 0,
    "partsCost" INTEGER NOT NULL DEFAULT 0,
    "total" INTEGER NOT NULL DEFAULT 0,
    "paid" INTEGER NOT NULL DEFAULT 0,
    "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "service_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "service_items" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "price" INTEGER NOT NULL,
    "subtotal" INTEGER NOT NULL,
    "isPart" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "service_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_tickets_tenantId_idx" ON "service_tickets"("tenantId");

-- CreateIndex
CREATE INDEX "service_tickets_tenantId_status_idx" ON "service_tickets"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "service_tickets_tenantId_number_key" ON "service_tickets"("tenantId", "number");

-- CreateIndex
CREATE INDEX "service_items_ticketId_idx" ON "service_items"("ticketId");

-- AddForeignKey
ALTER TABLE "service_tickets" ADD CONSTRAINT "service_tickets_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "service_items" ADD CONSTRAINT "service_items_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
