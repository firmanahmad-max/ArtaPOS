import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { isPlatformAdmin } from "@/lib/auth/super-admin";
import { can, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/**
 * Konteks auth untuk Server Action/Service. Redirect ke /login bila belum login.
 * Memakai getCurrentUser (cek DB): role SELALU segar & status aktif user/tenant
 * diverifikasi — bukan dari JWT yang bisa basi (peran lama / user nonaktif)
 * sampai 7 hari. getCurrentUser ter-cache per request (nol biaya ganda).
 */
export async function getAuthContext(): Promise<AuthContext> {
  const user = await getCurrentUser();
  return { userId: user.id, tenantId: user.tenantId, role: user.role };
}

/** Error izin (ditangkap action → pesan ke user). */
export class ForbiddenError extends Error {
  constructor(message = "Anda tidak punya izin untuk tindakan ini.") {
    super(message);
    this.name = "ForbiddenError";
  }
}

/** Pastikan konteks auth + izin tertentu. */
export async function requirePermission(
  permission: Permission,
): Promise<AuthContext> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, permission)) {
    throw new ForbiddenError();
  }
  return ctx;
}

/**
 * Pastikan user adalah admin platform (super-admin). Untuk halaman/aksi
 * LINTAS-TENANT (Dashboard Admin). Bukan super-admin → alihkan ke dashboard toko.
 */
export async function requireSuperAdmin() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) {
    redirect("/dashboard");
  }
  return user;
}

/** Versi untuk Server Action: lempar Forbidden bila bukan super-admin. */
export async function requireSuperAdminAction() {
  const user = await getCurrentUser();
  if (!isPlatformAdmin(user)) {
    throw new ForbiddenError("Khusus admin platform.");
  }
  return user;
}
