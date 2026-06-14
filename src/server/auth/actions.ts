"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { db } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";
import { isLoginLocked, recordLoginFailure, clearLoginAttempts } from "@/lib/auth/rate-limit";
import { loginSchema, type FormState } from "@/lib/validations/auth";

// Ambang lebih longgar untuk IP (satu toko bisa ber-NAT / banyak kasir), tapi
// tetap menangkap brute-force/credential-stuffing lintas akun dari satu sumber.
const IP_LIMIT = { maxAttempts: 20 };

/** IP klien dari header proxy (Vercel set x-forwarded-for). */
async function getClientIp(): Promise<string> {
  const h = await headers();
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]?.trim() || "unknown";
  return h.get("x-real-ip")?.trim() || "unknown";
}

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
  const ip = await getClientIp();
  const emailKey = `email:${email}`;
  const ipKey = `ip:${ip}`;

  if ((await isLoginLocked(emailKey)) || (await isLoginLocked(ipKey))) {
    return { message: "Terlalu banyak percobaan. Coba lagi dalam beberapa menit." };
  }

  const recordFailure = async () => {
    await recordLoginFailure(emailKey);
    await recordLoginFailure(ipKey, IP_LIMIT);
  };

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
    await recordFailure();
    return { message: GENERIC };
  }

  const valid = await verifyPassword(user.passwordHash, password);
  if (!valid) {
    await recordFailure();
    return { message: GENERIC };
  }

  await clearLoginAttempts(emailKey);
  await clearLoginAttempts(ipKey);

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
