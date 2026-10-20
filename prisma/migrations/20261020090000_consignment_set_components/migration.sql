-- AlterTable
ALTER TABLE "consignment_items" ADD COLUMN     "components" JSONB NOT NULL DEFAULT '[]';
