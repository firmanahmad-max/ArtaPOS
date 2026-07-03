import { z } from "zod";

/** Validasi klaim RMA (kirim barang ke distributor untuk klaim garansi). */
export const rmaClaimSchema = z.object({
  warrantyUnitId: z.string().min(1).optional(),
  productId: z.string().min(1).optional(),
  productName: z.string().min(1, "Nama produk wajib diisi").max(200).trim(),
  serialNumber: z.string().max(100).trim().optional(),
  complaint: z.string().min(3, "Kerusakan/keluhan wajib diisi").max(1000).trim(),
  supplierId: z.string().min(1).optional(),
  supplierName: z.string().min(1, "Distributor/supplier wajib diisi").max(200).trim(),
  trackingNumber: z.string().max(100).trim().optional(),
  sentAt: z.string().min(1).optional(), // yyyy-mm-dd; default hari ini
  note: z.string().max(1000).trim().optional(),
});
export type RmaClaimInput = z.infer<typeof rmaClaimSchema>;

export const RMA_RESOLUTIONS = ["REPAIRED", "REPLACED", "REFUNDED"] as const;

/** Validasi saat menandai klaim kembali diterima dari distributor. */
export const rmaReceiveSchema = z.object({
  resolution: z.enum(RMA_RESOLUTIONS, "Pilih hasil klaim"),
  receivedAt: z.string().min(1).optional(), // default hari ini
  replacementSn: z.string().max(100).trim().optional(),
  note: z.string().max(1000).trim().optional(),
});
export type RmaReceiveInput = z.infer<typeof rmaReceiveSchema>;
