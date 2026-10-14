import { z } from "zod";

const opt = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v ? v : undefined));

export const commissionSchema = z
  .object({
    commissionType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
    commissionValue: z.number().int().min(0, "Komisi tidak boleh negatif").default(0),
  })
  .refine((c) => c.commissionType !== "PERCENT" || c.commissionValue <= 100, {
    message: "Komisi persen maksimal 100%",
    path: ["commissionValue"],
  });

export const consignmentItemSchema = z
  .object({
    category: z.string().trim().min(1, "Jenis komponen wajib diisi").max(40),
    name: z.string().trim().min(1, "Nama/tipe barang wajib diisi").max(120),
    serialNumber: opt(60),
    condition: opt(300),
    askingPrice: z.number().int().min(0, "Harga tidak boleh negatif"),
    commissionType: z.enum(["PERCENT", "FIXED"]).default("PERCENT"),
    commissionValue: z.number().int().min(0, "Komisi tidak boleh negatif").default(0),
  })
  .refine((c) => c.commissionType !== "PERCENT" || c.commissionValue <= 100, {
    message: "Komisi persen maksimal 100%",
    path: ["commissionValue"],
  });

export const consignmentSchema = z.object({
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().trim().min(1, "Nama pemilik wajib diisi").max(100),
  customerPhone: opt(30),
  note: opt(500),
  items: z.array(consignmentItemSchema).min(1, "Tambahkan minimal satu barang").max(50),
});

export type ConsignmentInput = z.infer<typeof consignmentSchema>;
export type ConsignmentItemInput = z.infer<typeof consignmentItemSchema>;
