import { z } from "zod";

export const purchaseItemSchema = z.object({
  productId: z.string().min(1),
  qty: z.number().int().positive("Qty harus > 0"),
  costPrice: z.number().int().min(0, "Harga beli tidak boleh negatif"),
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
