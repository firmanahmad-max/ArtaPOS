import "server-only";
import { env } from "@/lib/env";
import {
  parseSuperAdminEmails,
  emailInSuperAdminList,
  isSuperAdminByFlag,
} from "@/lib/auth/super-admin-core";

/**
 * Admin platform (operator SaaS). Otoritas = flag DB `User.isSuperAdmin`.
 * Env `SUPER_ADMIN_EMAILS` HANYA dipakai untuk BOOTSTRAP flag saat login
 * (lihat loginAction), bukan sebagai sumber otoritas langsung.
 */

/** Daftar email admin platform dari env (lowercase, ter-trim). */
export function superAdminEmails(): string[] {
  return parseSuperAdminEmails(env.SUPER_ADMIN_EMAILS);
}

/** Apakah email termasuk allowlist env (dipakai hanya untuk bootstrap login). */
export function isEnvSuperAdmin(email: string): boolean {
  return emailInSuperAdminList(email, superAdminEmails());
}

/**
 * Otorisasi admin platform = HANYA flag DB. Email allowlist TIDAK memberi akses
 * langsung (cegah eskalasi lintas-tenant via email yang unik per-tenant).
 */
export function isPlatformAdmin(user: { email?: string; isSuperAdmin?: boolean }): boolean {
  return isSuperAdminByFlag(user);
}
