-- AlterTable
ALTER TABLE "sales" ADD COLUMN     "serviceFee" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "serviceFeeLabel" TEXT;
