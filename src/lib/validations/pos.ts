import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive("Qty harus > 0"),
  discount: z.number().int().min(0).default(0),
});

/** Baris barang TITIPAN (titip jual) — selalu 1 unit; harga dari DB. */
export const saleConsignmentItemSchema = z.object({
  consignmentItemId: z.string().min(1),
  discount: z.number().int().min(0).default(0),
});

/** Baris BARANG BEKAS milik toko — selalu 1 unit; harga dari DB. */
export const saleUsedItemSchema = z.object({
  usedItemId: z.string().min(1),
  discount: z.number().int().min(0).default(0),
});

export const saleSchema = z
  .object({
  items: z.array(saleItemSchema).default([]),
  consignmentItems: z.array(saleConsignmentItemSchema).max(50).default([]),
  usedItems: z.array(saleUsedItemSchema).max(50).default([]),
  customerId: z.string().min(1).optional().nullable(),
  discount: z.number().int().min(0).default(0),
  // Biaya lain/jasa (mis. jasa setup/instal aplikasi) — menambah total, tanpa HPP.
  serviceFee: z.number().int().min(0).default(0),
  serviceFeeLabel: z.string().max(60).optional(),
  // Tukar poin loyalitas sebagai potongan (wajib pelanggan terdaftar; nilai dari DB).
  redeemPoints: z.number().int().min(0).max(100_000_000).default(0),
  paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS", "CREDIT"]).default("CASH"),
  paid: z.number().int().min(0).default(0),
  dueDate: z.string().min(1).optional().nullable(),
  note: z.string().max(255).optional(),
  // Sinkronisasi offline (opsional): id operasi unik per perangkat (idempotensi)
  // & waktu transaksi asli di perangkat (agar penjualan bertanggal saat terjadi,
  // bukan saat tersinkron).
  clientOpId: z.string().min(8).max(64).optional(),
  clientCreatedAt: z.string().datetime().optional(),
  })
  .refine((s) => s.items.length + s.consignmentItems.length + s.usedItems.length > 0, {
    message: "Keranjang masih kosong",
    path: ["items"],
  });
export type SaleInput = z.infer<typeof saleSchema>;

export const salePaymentSchema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus > 0"),
  note: z.string().max(255).trim().optional().or(z.literal("")),
});
export type SalePaymentInput = z.infer<typeof salePaymentSchema>;
