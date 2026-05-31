import "server-only";
import { verifySession } from "@/lib/auth/dal";
import { can, type Permission } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";

export interface AuthContext {
  userId: string;
  tenantId: string;
  role: UserRole;
}

/** Konteks auth untuk Server Action/Service. Redirect ke /login bila belum login. */
export async function getAuthContext(): Promise<AuthContext> {
  const s = await verifySession();
  return { userId: s.userId, tenantId: s.tenantId, role: s.role };
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
