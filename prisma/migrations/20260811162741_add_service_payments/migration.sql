-- CreateTable
CREATE TABLE "service_payments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod",
    "note" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_payments_tenantId_idx" ON "service_payments"("tenantId");

-- CreateIndex
CREATE INDEX "service_payments_tenantId_createdAt_idx" ON "service_payments"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "service_payments_ticketId_idx" ON "service_payments"("ticketId");

-- AddForeignKey
ALTER TABLE "service_payments" ADD CONSTRAINT "service_payments_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: buat SATU catatan pembayaran untuk tiap tiket yang sudah ada nilai
-- `paid`-nya (sebelum rincian per-pembayaran ada). Ditanggalkan pada completedAt
-- (saat diserahkan/dibayar) atau createdAt bila belum. Ini menjaga pendapatan
-- servis historis tetap muncul di laporan yang kini berbasis pembayaran.
INSERT INTO "service_payments" ("id", "tenantId", "ticketId", "amount", "method", "note", "createdById", "createdAt")
SELECT gen_random_uuid()::text, st."tenantId", st."id", st."paid", st."paymentMethod",
       'Migrasi (pembayaran tercatat sebelum rincian per-pembayaran)',
       st."createdById", COALESCE(st."completedAt", st."createdAt")
FROM "service_tickets" st
WHERE st."paid" > 0;
