"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { userCreateSchema, licenseUpdateSchema, settingsSchema } from "@/lib/validations/admin";
import type { UserRole } from "@/generated/prisma/enums";
import { createUser, updateUserRole, setUserActive, updateTenantName } from "@/server/users/service";
import { updateLicense } from "@/server/license/service";

type Result = { ok: boolean; message?: string };

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Unique constraint") || (e as { code?: string })?.code === "P2002") {
    return "Email sudah dipakai pengguna lain.";
  }
  return msg || "Terjadi kesalahan.";
}

// ── Pengguna ─────────────────────────────────────────────────────────────—
export async function createUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "users.manage")) return { message: "Tidak punya izin." };

  const parsed = userCreateSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await createUser(user.tenantId, parsed.data);
  } catch (e) {
    return { message: friendly(e) };
  }
  revalidatePath("/users");
  return { ok: true, message: "Pengguna ditambahkan." };
}

export async function updateUserRoleAction(userId: string, role: UserRole): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "users.manage")) return { ok: false, message: "Tidak punya izin." };
  try {
    await updateUserRole(user.tenantId, userId, role);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: friendly(e) };
  }
}

export async function setUserActiveAction(userId: string, isActive: boolean): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "users.manage")) return { ok: false, message: "Tidak punya izin." };
  if (userId === user.id && !isActive) return { ok: false, message: "Tidak bisa menonaktifkan akun sendiri." };
  try {
    await setUserActive(user.tenantId, userId, isActive);
    revalidatePath("/users");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: friendly(e) };
  }
}

// ── Lisensi ──────────────────────────────────────────────────────────────—
export async function updateLicenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "license.manage")) return { message: "Tidak punya izin." };

  const parsed = licenseUpdateSchema.safeParse({
    plan: formData.get("plan"),
    status: formData.get("status"),
    maxTransactions: formData.get("maxTransactions") || undefined,
    validUntil: formData.get("validUntil") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await updateLicense(user.tenantId, parsed.data);
  } catch (e) {
    return { message: friendly(e) };
  }
  revalidatePath("/settings");
  return { ok: true, message: "Lisensi diperbarui." };
}

// ── Pengaturan toko ──────────────────────────────────────────────────────—
export async function updateSettingsAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "settings.manage")) return { message: "Tidak punya izin." };

  const parsed = settingsSchema.safeParse({ name: formData.get("name") });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await updateTenantName(user.tenantId, parsed.data.name);
  } catch (e) {
    return { message: friendly(e) };
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Pengaturan disimpan." };
}
