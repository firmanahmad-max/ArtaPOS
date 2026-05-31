import { z } from "zod";

/** Angka rupiah dari input form (string/number) → integer >= 0. */
const rupiah = z.coerce.number().int("Harus bilangan bulat").min(0, "Tidak boleh negatif");
const qtyInt = z.coerce.number().int("Harus bilangan bulat");

export const categorySchema = z.object({
  name: z.string().min(1, "Nama kategori wajib diisi").max(60).trim(),
  description: z.string().max(255).trim().optional().or(z.literal("")),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const unitSchema = z.object({
  name: z.string().min(1, "Nama satuan wajib diisi").max(30).trim(),
  symbol: z.string().max(10).trim().optional().or(z.literal("")),
});
export type UnitInput = z.infer<typeof unitSchema>;

export const productSchema = z.object({
  sku: z.string().min(1, "SKU/kode wajib diisi").max(50).trim(),
  barcode: z.string().max(64).trim().optional().or(z.literal("")),
  name: z.string().min(1, "Nama produk wajib diisi").max(150).trim(),
  categoryId: z.string().trim().optional().or(z.literal("")),
  unitId: z.string().trim().optional().or(z.literal("")),
  costPrice: rupiah.default(0),
  sellPrice: rupiah.default(0),
  initialStock: z.coerce.number().int().min(0, "Tidak boleh negatif").default(0),
  minStock: z.coerce.number().int().min(0, "Tidak boleh negatif").default(0),
  warrantyMonths: z.coerce.number().int().min(0, "Tidak boleh negatif").default(0),
});
export type ProductInput = z.infer<typeof productSchema>;

/** Penyesuaian stok manual. */
export const stockAdjustSchema = z.object({
  productId: z.string().min(1),
  /** qty bertanda: positif = tambah, negatif = kurang. */
  qty: qtyInt.refine((v) => v !== 0, "Jumlah tidak boleh 0"),
  note: z.string().max(255).trim().optional().or(z.literal("")),
});
export type StockAdjustInput = z.infer<typeof stockAdjustSchema>;
