import "server-only";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import type { UserRole } from "@/generated/prisma/enums";
import type { UserCreateInput } from "@/lib/validations/admin";

/** Daftar pengguna tenant (untuk pilih teknisi, dll). */
export function listUsers(tenantId: string) {
  return db.user.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });
}

/** Daftar lengkap pengguna untuk halaman manajemen. */
export function listUsersFull(tenantId: string) {
  return db.user.findMany({
    where: { tenantId },
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function createUser(tenantId: string, input: UserCreateInput) {
  const passwordHash = await hashPassword(input.password);
  return db.user.create({
    data: {
      tenantId,
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
    },
  });
}

export async function updateUserRole(tenantId: string, userId: string, role: UserRole) {
  const u = await db.user.findFirst({ where: { id: userId, tenantId }, select: { id: true, role: true } });
  if (!u) throw new Error("Pengguna tidak ditemukan.");
  // Cegah menurunkan OWNER terakhir.
  if (u.role === "OWNER" && role !== "OWNER") {
    const owners = await db.user.count({ where: { tenantId, role: "OWNER", isActive: true } });
    if (owners <= 1) throw new Error("Tidak bisa menurunkan satu-satunya Pemilik.");
  }
  return db.user.update({ where: { id: userId }, data: { role } });
}

export async function setUserActive(tenantId: string, userId: string, isActive: boolean) {
  const u = await db.user.findFirst({ where: { id: userId, tenantId }, select: { id: true, role: true } });
  if (!u) throw new Error("Pengguna tidak ditemukan.");
  if (!isActive && u.role === "OWNER") {
    const owners = await db.user.count({ where: { tenantId, role: "OWNER", isActive: true } });
    if (owners <= 1) throw new Error("Tidak bisa menonaktifkan satu-satunya Pemilik.");
  }
  return db.user.update({ where: { id: userId }, data: { isActive } });
}

/** Perbarui nama toko (pengaturan). */
export async function updateTenantName(tenantId: string, name: string) {
  return db.tenant.update({ where: { id: tenantId }, data: { name } });
}
