/**
 * Logika MURNI super-admin (tanpa env/DB/server-only) — dapat diuji unit.
 * Dipisah agar keputusan otorisasi bisa diregresi-test tanpa boot env/Prisma.
 */

/** Parse daftar email admin dari string CSV → array lowercase ter-trim. */
export function parseSuperAdminEmails(csv: string | undefined | null): string[] {
  return (csv ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Apakah `email` termasuk dalam allowlist? (case-insensitive, ter-trim) */
export function emailInSuperAdminList(email: string, list: string[]): boolean {
  return list.includes(email.trim().toLowerCase());
}

/**
 * Keputusan OTORISASI admin platform = HANYA flag DB `isSuperAdmin`.
 *
 * Email allowlist (env) TIDAK dipakai sebagai sumber otoritas langsung — hanya
 * untuk BOOTSTRAP saat login yang dijaga keunikan email. Alasannya: email unik
 * PER-TENANT (bukan global), sehingga bila email dijadikan otoritas langsung,
 * admin sebuah tenant bisa membuat akun beremail admin lalu "menjadi" admin
 * platform lintas-tenant (eskalasi privilege).
 */
export function isSuperAdminByFlag(user: { isSuperAdmin?: boolean | null }): boolean {
  return Boolean(user.isSuperAdmin);
}
