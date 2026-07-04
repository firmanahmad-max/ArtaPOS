import { z } from "zod";

export const LICENSE_PLANS = ["DEMO_DAILY", "DEMO_MONTHLY", "DEMO_TRANSACTIONS", "UNLIMITED"] as const;
export const LICENSE_STATUSES = ["ACTIVE", "EXPIRED", "SUSPENDED"] as const;

const optInt = z.coerce.number().int().positive().optional().nullable();

/** Edit lisensi sebuah toko (dari Dashboard Admin). */
export const tenantLicenseSchema = z.object({
  plan: z.enum(LICENSE_PLANS),
  status: z.enum(LICENSE_STATUSES),
  maxTransactions: optInt,
  validUntil: z.string().trim().optional().nullable(),
});
export type TenantLicenseInput = z.infer<typeof tenantLicenseSchema>;

/** Buat kode promo/aktivasi lisensi. */
export const promoCodeSchema = z.object({
  code: z.string().min(3, "Kode minimal 3 karakter").max(40).trim(),
  plan: z.enum(LICENSE_PLANS),
  durationDays: z.coerce.number().int().positive().max(3650).optional().nullable(),
  maxTransactions: optInt,
  maxRedemptions: optInt,
  expiresAt: z.string().trim().optional().nullable(),
  note: z.string().max(200).trim().optional(),
});
export type PromoCodeInput = z.infer<typeof promoCodeSchema>;
