import { z } from "zod";

export const saleItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive("Qty harus > 0"),
  discount: z.number().int().min(0).default(0),
});

export const saleSchema = z.object({
  items: z.array(saleItemSchema).min(1, "Keranjang masih kosong"),
  customerId: z.string().min(1).optional().nullable(),
  discount: z.number().int().min(0).default(0),
  paymentMethod: z.enum(["CASH", "TRANSFER", "QRIS", "CREDIT"]).default("CASH"),
  paid: z.number().int().min(0).default(0),
  dueDate: z.string().min(1).optional().nullable(),
  note: z.string().max(255).optional(),
  // Sinkronisasi offline (opsional): id operasi unik per perangkat (idempotensi)
  // & waktu transaksi asli di perangkat (agar penjualan bertanggal saat terjadi,
  // bukan saat tersinkron).
  clientOpId: z.string().min(8).max(64).optional(),
  clientCreatedAt: z.string().datetime().optional(),
});
export type SaleInput = z.infer<typeof saleSchema>;

export const salePaymentSchema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus > 0"),
  note: z.string().max(255).trim().optional().or(z.literal("")),
});
export type SalePaymentInput = z.infer<typeof salePaymentSchema>;
