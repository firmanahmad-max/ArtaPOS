import type { UserRole } from "@/generated/prisma/enums";

/**
 * Role-Based Access Control.
 * Hirarki sederhana + cek izin granular per area fitur.
 */

/** Urutan kekuatan peran (besar = lebih tinggi). */
const ROLE_RANK: Record<UserRole, number> = {
  KASIR: 1,
  TEKNISI: 1,
  ADMIN: 2,
  OWNER: 3,
};

/** Apakah `role` punya level minimal `min`. */
export function hasRoleAtLeast(role: UserRole, min: UserRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[min];
}

/** Area fitur aplikasi (dipakai untuk menyaring menu & aksi). */
export type Permission =
  | "pos.use"
  | "inventory.manage"
  | "purchasing.manage"
  | "service.manage"
  | "pcbuild.manage"
  | "finance.view"
  | "reports.view"
  | "users.manage"
  | "settings.manage"
  | "license.manage";

/** Izin per peran. OWNER mendapat semua. */
const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  OWNER: [
    "pos.use",
    "inventory.manage",
    "purchasing.manage",
    "service.manage",
    "pcbuild.manage",
    "finance.view",
    "reports.view",
    "users.manage",
    "settings.manage",
    "license.manage",
  ],
  ADMIN: [
    "pos.use",
    "inventory.manage",
    "purchasing.manage",
    "service.manage",
    "pcbuild.manage",
    "finance.view",
    "reports.view",
    "users.manage",
    "settings.manage",
  ],
  KASIR: ["pos.use", "reports.view"],
  TEKNISI: ["service.manage", "pcbuild.manage"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const ROLE_LABELS: Record<UserRole, string> = {
  OWNER: "Pemilik",
  ADMIN: "Admin",
  KASIR: "Kasir",
  TEKNISI: "Teknisi",
};
