-- AlterTable
ALTER TABLE "rma_claims" ADD COLUMN     "warrantyUnitId" TEXT;

-- AddForeignKey
ALTER TABLE "rma_claims" ADD CONSTRAINT "rma_claims_warrantyUnitId_fkey" FOREIGN KEY ("warrantyUnitId") REFERENCES "warranty_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
