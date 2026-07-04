"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdminAction } from "@/lib/auth/guard";
import { toFieldErrors, type FormState } from "@/lib/form";
import { tenantLicenseSchema, promoCodeSchema } from "@/lib/validations/platform";
import * as svc from "@/server/platform/service";

type Result = { ok: boolean; message?: string };

// ── Lisensi toko ───────────────────────────────────────────────────────────
export async function updateTenantLicenseAction(
  tenantId: string,
  input: unknown,
): Promise<Result> {
  await requireSuperAdminAction();
  const parsed = tenantLicenseSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  try {
    await svc.updateTenantLicense(tenantId, parsed.data);
    revalidatePath("/admin/tenants");
    revalidatePath("/admin");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function setTenantActiveAction(tenantId: string, isActive: boolean): Promise<Result> {
  await requireSuperAdminAction();
  try {
    await svc.setTenantActive(tenantId, isActive);
    revalidatePath("/admin/tenants");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function resetLicenseUsageAction(tenantId: string): Promise<Result> {
  await requireSuperAdminAction();
  try {
    await svc.resetLicenseUsage(tenantId);
    revalidatePath("/admin/tenants");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

// ── Akses super-admin ──────────────────────────────────────────────────────
export async function setSuperAdminAction(userId: string, value: boolean): Promise<Result> {
  const me = await requireSuperAdminAction();
  if (userId === me.id && !value) {
    return { ok: false, message: "Tidak bisa mencabut akses admin Anda sendiri." };
  }
  try {
    await svc.setSuperAdmin(userId, value);
    revalidatePath("/admin/access");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

// ── Kode promo ─────────────────────────────────────────────────────────────
export async function createPromoCodeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const me = await requireSuperAdminAction();
  const parsed = promoCodeSchema.safeParse({
    code: formData.get("code"),
    plan: formData.get("plan"),
    durationDays: formData.get("durationDays") || undefined,
    maxTransactions: formData.get("maxTransactions") || undefined,
    maxRedemptions: formData.get("maxRedemptions") || undefined,
    expiresAt: formData.get("expiresAt") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.createPromoCode(me.id, parsed.data);
    revalidatePath("/admin/promo");
    return { ok: true };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuat kode." };
  }
}

export async function setPromoActiveAction(id: string, isActive: boolean): Promise<Result> {
  await requireSuperAdminAction();
  try {
    await svc.setPromoActive(id, isActive);
    revalidatePath("/admin/promo");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function deletePromoCodeAction(id: string): Promise<Result> {
  await requireSuperAdminAction();
  try {
    await svc.deletePromoCode(id);
    revalidatePath("/admin/promo");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}
