import { z } from "zod";

export const pcBuildSchema = z.object({
  name: z.string().min(1, "Nama rakitan wajib").max(120).trim(),
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().max(120).trim().optional().or(z.literal("")),
  // No. WA pelanggan (tak disimpan di rakitan) — untuk mencocokkan / mendaftarkan member.
  customerPhone: z.string().max(30).trim().optional().or(z.literal("")),
  registerMember: z.preprocess((v) => v === true || v === "on" || v === "true", z.boolean()).default(false),
  buildFee: z.coerce.number().int().min(0).default(0),
  note: z.string().max(500).trim().optional().or(z.literal("")),
});
export type PcBuildInput = z.infer<typeof pcBuildSchema>;
