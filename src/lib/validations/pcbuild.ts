import { z } from "zod";

export const pcBuildSchema = z.object({
  name: z.string().min(1, "Nama rakitan wajib").max(120).trim(),
  customerId: z.string().min(1).optional().nullable(),
  customerName: z.string().max(120).trim().optional().or(z.literal("")),
  buildFee: z.coerce.number().int().min(0).default(0),
  note: z.string().max(500).trim().optional().or(z.literal("")),
});
export type PcBuildInput = z.infer<typeof pcBuildSchema>;
