import { z } from "zod";

export const loginSchema = z.object({
  email: z.email("Email tidak valid").trim().toLowerCase(),
  password: z.string().min(1, "Password wajib diisi"),
});
export type LoginInput = z.infer<typeof loginSchema>;

const strongPassword = z
  .string()
  .min(8, "Minimal 8 karakter")
  .regex(/[a-zA-Z]/, "Harus mengandung huruf")
  .regex(/[0-9]/, "Harus mengandung angka");

export const onboardingSchema = z
  .object({
    storeName: z.string().min(2, "Nama toko minimal 2 karakter").max(100).trim(),
    ownerName: z.string().min(2, "Nama pemilik minimal 2 karakter").max(100).trim(),
    ownerEmail: z.email("Email tidak valid").trim().toLowerCase(),
    password: strongPassword,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    error: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });
export type OnboardingInput = z.infer<typeof onboardingSchema>;

/** Bentuk state untuk useActionState pada form. */
export type FormState =
  | {
      ok?: boolean;
      message?: string;
      errors?: Record<string, string[]>;
    }
  | undefined;
