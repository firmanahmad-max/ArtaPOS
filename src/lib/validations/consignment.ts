import { z } from "zod";
import { MAX_SET_COMPONENTS, MIN_SET_COMPONENTS } from "@/lib/consignment-set";

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

/** Seperti `opt`, tapi juga menerima null (rincian paket dibaca dari kolom JSON). */
const optNull = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .nullish()
    .transform((v) => (v ? v : undefined));

export const setComponentSchema = z.object({
  name: z.string().trim().min(1, "Nama komponen wajib diisi").max(120),
  serialNumber: optNull(60),
  note: optNull(120),
});

/** Rincian isi paket/set: kosong (barang tunggal) atau 2–20 komponen. */
export const setComponentsSchema = z
  .array(setComponentSchema)
  .max(MAX_SET_COMPONENTS, `Paket maksimal ${MAX_SET_COMPONENTS} komponen`)
  .refine((l) => l.length === 0 || l.length >= MIN_SET_COMPONENTS, {
    message: `Paket minimal ${MIN_SET_COMPONENTS} komponen — atau kosongkan rincian agar jadi barang tunggal`,
  });

export const consignmentItemSchema = z
  .object({
    category: z.string().trim().min(1, "Jenis komponen wajib diisi").max(40),
    name: z.string().trim().min(1, "Nama/tipe barang wajib diisi").max(120),
    serialNumber: opt(60),
    condition: opt(300),
    components: setComponentsSchema.default([]),
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
