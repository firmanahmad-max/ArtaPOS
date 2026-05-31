import { z } from "zod";

export const warrantyRegisterSchema = z.object({
  productId: z.string().min(1).optional().nullable(),
  productName: z.string().min(1, "Nama produk wajib").max(150).trim(),
  serialNumber: z.string().min(1, "Nomor seri wajib").max(120).trim(),
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().max(120).trim().optional().or(z.literal("")),
  saleNumber: z.string().max(40).trim().optional().or(z.literal("")),
  soldAt: z.string().min(1).optional().nullable(),
  warrantyMonths: z.coerce.number().int().min(0).default(0),
  note: z.string().max(255).trim().optional().or(z.literal("")),
});
export type WarrantyRegisterInput = z.infer<typeof warrantyRegisterSchema>;
