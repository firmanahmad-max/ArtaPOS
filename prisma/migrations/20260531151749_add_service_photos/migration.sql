-- CreateTable
CREATE TABLE "service_photos" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "dataUrl" TEXT NOT NULL,
    "caption" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "service_photos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_photos_ticketId_idx" ON "service_photos"("ticketId");

-- AddForeignKey
ALTER TABLE "service_photos" ADD CONSTRAINT "service_photos_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "service_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
