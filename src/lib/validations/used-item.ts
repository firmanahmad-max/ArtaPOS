import { z } from "zod";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((v) => (v ? v : undefined));

export const usedItemSchema = z.object({
  category: z.string().trim().min(1, "Jenis barang wajib diisi").max(40),
  name: z.string().trim().min(1, "Nama/merk-tipe wajib diisi").max(120),
  serialNumber: opt(60),
  grade: z.enum(["LIKE_NEW", "GOOD", "FAIR", "POOR"]).default("GOOD"),
  condition: opt(500),
  completeness: opt(200),
  specs: opt(1000),
  costPrice: z.number().int().min(0, "Harga beli tidak boleh negatif").max(2_000_000_000),
  sellPrice: z.number().int().min(0, "Harga jual tidak boleh negatif").max(2_000_000_000),
  warrantyDays: z.number().int().min(0).max(3650).default(0),
  source: z.enum(["BUY", "TRADE_IN", "SUPPLIER", "SERVICE", "OTHER"]).default("BUY"),
  sourceName: opt(100),
  sourcePhone: opt(30),
  // "YYYY-MM-DD" dari input date; kosong = hari ini.
  acquiredAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid")
    .optional()
    .nullable()
    .or(z.literal("")),
  note: opt(500),
});

export type UsedItemInput = z.infer<typeof usedItemSchema>;
