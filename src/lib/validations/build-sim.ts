import { z } from "zod";

/** Satu komponen simulasi — boleh dari inventory (productId) atau bebas (ketik). */
export const simItemSchema = z.object({
  productId: z.string().min(1).optional().nullable(),
  name: z.string().min(1, "Nama komponen wajib").max(160).trim(),
  qty: z.coerce.number().int("Qty bulat").min(1, "Qty minimal 1").max(999),
  costPrice: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  sellPrice: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
});

/** Header + daftar komponen simulasi rakitan (disimpan sekaligus). */
export const buildSimSchema = z.object({
  name: z.string().min(1, "Nama rakitan wajib").max(120).trim(),
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().max(120).trim().optional().nullable(),
  customerPhone: z.string().max(30).trim().optional().nullable(),
  budget: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  buildFee: z.coerce.number().int().min(0).max(2_000_000_000).default(0),
  note: z.string().max(1000).trim().optional().nullable(),
  /** Tanggal pembuatan (editable) — ISO/date string; kosong = sekarang. */
  createdAt: z.string().min(1).optional().nullable(),
  items: z.array(simItemSchema).max(100).default([]),
});

export type BuildSimInput = z.infer<typeof buildSimSchema>;
export type SimItemInput = z.infer<typeof simItemSchema>;
