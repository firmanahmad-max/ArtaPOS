import { z } from "zod";

export const userCreateSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter").max(100).trim(),
  email: z.email("Email tidak valid").trim().toLowerCase(),
  password: z.string().min(8, "Password minimal 8 karakter").regex(/[0-9]/, "Harus ada angka"),
  role: z.enum(["OWNER", "ADMIN", "KASIR", "TEKNISI"]),
});
export type UserCreateInput = z.infer<typeof userCreateSchema>;

export const userRoleSchema = z.object({
  role: z.enum(["OWNER", "ADMIN", "KASIR", "TEKNISI"]),
});

export const licenseUpdateSchema = z.object({
  plan: z.enum(["DEMO_DAILY", "DEMO_MONTHLY", "DEMO_TRANSACTIONS", "UNLIMITED"]),
  status: z.enum(["ACTIVE", "EXPIRED", "SUSPENDED"]),
  maxTransactions: z.coerce.number().int().min(0).optional().nullable(),
  validUntil: z.string().min(1).optional().nullable(),
});
export type LicenseUpdateInput = z.infer<typeof licenseUpdateSchema>;

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null));

export const settingsSchema = z.object({
  name: z.string().min(2, "Nama toko minimal 2 karakter").max(100).trim(),
  address: optionalText(200),
  phone: optionalText(30),
  receiptFooter: optionalText(150),
  trackPromo: optionalText(500),
});
export type SettingsInput = z.infer<typeof settingsSchema>;
