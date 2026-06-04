"use server";

import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from "@/lib/auth/rate-limit";
import { loginSchema, type FormState } from "@/lib/validations/auth";

/**
 * Login dengan email + password.
 * Catatan multi-tenant: email unik per-tenant. Untuk mode 1-toko, kita cari
 * user aktif berdasarkan email pada tenant aktif. (SaaS: scoping via subdomain.)
 */
export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: z_flatten(parsed.error) };
  }

  const { email, password } = parsed.data;

  if (await isLoginLocked(email)) {
    return { message: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  const user = await db.user.findFirst({
    where: { email, isActive: true, tenant: { isActive: true } },
    select: { id: true, tenantId: true, role: true, passwordHash: true },
  });

  // Pesan generik (jangan bocorkan apakah email ada) — cegah user enumeration.
  const GENERIC = "Email atau password salah.";
  if (!user) {
    // Tetap jalankan verifikasi dummy agar waktu respons konsisten (anti timing attack).
    await verifyPassword(
      "$argon2id$v=19$m=19456,t=2,p=1$ZHVtbXlzYWx0ZHVtbXk$0000000000000000000000000000000000000000000",
      password,
    );
    await recordLoginFailure(email);
    return { message: GENERIC };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    await recordLoginFailure(email);
    return { message: GENERIC };
  }

  await clearLoginAttempts(email);

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    userId: user.id,
    tenantId: user.tenantId,
    role: user.role,
  });

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  await deleteSession();
  redirect("/login");
}

/** Util kecil: ubah ZodError jadi map field -> pesan. */
function z_flatten(error: import("zod").ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (out[key] ??= []).push(issue.message);
  }
  return out;
}
