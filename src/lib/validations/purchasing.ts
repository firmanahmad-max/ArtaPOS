import { z } from "zod";

export const purchaseItemSchema = z
  .object({
    // Item bisa berupa produk lama (productId) ATAU produk baru (newProduct).
    productId: z.string().min(1).optional(),
    newProduct: z
      .object({
        name: z.string().min(1, "Nama produk wajib diisi").max(150).trim(),
        sku: z.string().min(1, "SKU wajib diisi").max(50).trim(),
      })
      .optional(),
    qty: z.number().int().positive("Qty harus > 0"),
    costPrice: z.number().int().min(0, "Harga beli tidak boleh negatif"),
  })
  .refine((it) => Boolean(it.productId) || Boolean(it.newProduct), {
    message: "Item harus produk lama atau produk baru.",
  });

export const purchaseSchema = z.object({
  supplierId: z.string().min(1).optional().nullable(),
  items: z.array(purchaseItemSchema).min(1, "Tambah minimal 1 item"),
  paidAmount: z.number().int().min(0).default(0),
  dueDate: z.string().min(1).optional().nullable(),
  note: z.string().max(255).optional(),
});
export type PurchaseInput = z.infer<typeof purchaseSchema>;

export const purchasePaymentSchema = z.object({
  amount: z.coerce.number().int().positive("Jumlah harus > 0"),
  note: z.string().max(255).trim().optional().or(z.literal("")),
});
export type PurchasePaymentInput = z.infer<typeof purchasePaymentSchema>;
