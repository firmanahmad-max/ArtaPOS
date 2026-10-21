-- AlterTable
ALTER TABLE "build_simulation_items" ADD COLUMN     "consignmentItemId" TEXT,
ADD COLUMN     "usedItemId" TEXT;

-- AlterTable
ALTER TABLE "consignment_items" ADD COLUMN     "pcBuildId" TEXT;

-- AlterTable
ALTER TABLE "pc_build_items" ADD COLUMN     "consignmentItemId" TEXT,
ADD COLUMN     "usedItemId" TEXT;

-- AlterTable
ALTER TABLE "used_items" ADD COLUMN     "pcBuildId" TEXT;
