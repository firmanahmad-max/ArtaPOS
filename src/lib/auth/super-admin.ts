import "server-only";
import { env } from "@/lib/env";

/**
 * Admin platform (operator SaaS). Diidentifikasi via flag DB `User.isSuperAdmin`,
 * di-bootstrap dari env `SUPER_ADMIN_EMAILS` (dipisah koma) saat login.
 */

/** Daftar email admin platform dari env (lowercase, ter-trim). */
export function superAdminEmails(): string[] {
  return (env.SUPER_ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Apakah email termasuk allowlist env. */
export function isEnvSuperAdmin(email: string): boolean {
  return superAdminEmails().includes(email.trim().toLowerCase());
}

/** Apakah user adalah admin platform (flag DB ATAU allowlist env). */
export function isPlatformAdmin(user: { email: string; isSuperAdmin?: boolean }): boolean {
  return Boolean(user.isSuperAdmin) || isEnvSuperAdmin(user.email);
}
