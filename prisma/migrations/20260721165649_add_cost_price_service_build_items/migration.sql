-- AlterTable
ALTER TABLE "pc_build_items" ADD COLUMN     "costPrice" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "service_items" ADD COLUMN     "costPrice" INTEGER NOT NULL DEFAULT 0;

-- Backfill baris lama dengan harga modal produk SAAT INI (perkiraan terbaik yang
-- tersedia). Tanpa ini semua baris lama bernilai 0 dan laba servis/rakitan masa
-- lalu akan terlihat 100% margin. Baris jasa/non-stok (productId NULL) tetap 0.
UPDATE "service_items" si
   SET "costPrice" = p."costPrice"
  FROM "products" p
 WHERE si."productId" = p."id";

UPDATE "pc_build_items" bi
   SET "costPrice" = p."costPrice"
  FROM "products" p
 WHERE bi."productId" = p."id";
