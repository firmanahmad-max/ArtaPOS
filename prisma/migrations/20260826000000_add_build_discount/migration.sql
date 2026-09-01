-- AlterTable: potongan harga pada rakitan PC (total = componentsCost + buildFee - discount)
ALTER TABLE "pc_builds" ADD COLUMN "discount" INTEGER NOT NULL DEFAULT 0;
