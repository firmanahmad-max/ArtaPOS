-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LinkVisitKind" ADD VALUE 'PORTAL_FROM_RECEIPT';
ALTER TYPE "LinkVisitKind" ADD VALUE 'PORTAL_FROM_SERVICE';
ALTER TYPE "LinkVisitKind" ADD VALUE 'PORTAL_FROM_REMINDER';
ALTER TYPE "LinkVisitKind" ADD VALUE 'PORTAL_FROM_INVITE';
ALTER TYPE "LinkVisitKind" ADD VALUE 'PORTAL_DIRECT';

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "portalLastSeenAt" TIMESTAMP(3),
ADD COLUMN     "portalViews" INTEGER NOT NULL DEFAULT 0;
