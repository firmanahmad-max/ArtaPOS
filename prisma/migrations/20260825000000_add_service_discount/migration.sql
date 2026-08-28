-- AlterTable: potongan harga pada tiket servis (total = laborCost + partsCost - discount)
ALTER TABLE "service_tickets" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0;
