import { z } from "zod";

/** Skema bersama untuk Supplier & Customer. */
export const contactSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(120).trim(),
  phone: z.string().max(30).trim().optional().or(z.literal("")),
  email: z.union([z.email("Email tidak valid"), z.literal("")]).optional(),
  address: z.string().max(255).trim().optional().or(z.literal("")),
});
export type ContactInput = z.infer<typeof contactSchema>;
