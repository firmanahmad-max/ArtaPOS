"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { contactSchema } from "@/lib/validations/contacts";
import * as svc from "@/server/customers/service";
import * as portal from "@/server/portal/service";
import { startOfDay } from "@/lib/timezone";

const NO_PERM = "Anda tidak punya izin mengelola pelanggan.";

function parse(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    // Checkbox hanya ada di form edit pelanggan (penanda waConsentField).
    waConsent: formData.has("waConsentField") ? formData.get("waConsent") === "on" : undefined,
  });
}

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.createCustomer(ctx.tenantId, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/customers");
  return { ok: true, message: "Pelanggan ditambahkan." };
}

export async function updateCustomerAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.updateCustomer(ctx.tenantId, id, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function deactivateCustomerAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) throw new Error(NO_PERM);
  await svc.deactivateCustomer(ctx.tenantId, id);
  revalidatePath("/customers");
}

export async function adjustPointsAction(
  customerId: string,
  points: number,
  type: "REDEEM" | "ADJUST",
  note: string,
): Promise<{ ok: boolean; message?: string; balance?: number }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  if (!Number.isFinite(points) || points <= 0) return { ok: false, message: "Jumlah poin tidak valid." };
  try {
    const r = await svc.adjustPoints(ctx.tenantId, customerId, points, type, note || undefined);
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, balance: r.balance };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

/** Ubah aturan tukar poin toko (nilai rupiah per poin & minimal tukar). */
export async function updateLoyaltyConfigAction(
  pointValue: number,
  minRedeem: number,
  serviceMultiplier = 2,
): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: "Tidak punya izin." };
  if (!Number.isInteger(pointValue) || pointValue < 0 || pointValue > 1000) {
    return { ok: false, message: "Nilai poin harus 0–1.000 rupiah." };
  }
  if (!Number.isInteger(minRedeem) || minRedeem < 0 || minRedeem > 1_000_000) {
    return { ok: false, message: "Minimal tukar tidak valid." };
  }
  if (!Number.isInteger(serviceMultiplier) || serviceMultiplier < 1 || serviceMultiplier > 5) {
    return { ok: false, message: "Pengali poin jasa servis harus 1–5." };
  }
  try {
    await svc.updateLoyaltyConfig(ctx.tenantId, { pointValue, minRedeem, serviceMultiplier });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/column|does not exist|P2022/i.test(msg)) {
      return { ok: false, message: "Database produksi belum dimigrasi (kolom poin belum ada)." };
    }
    return { ok: false, message: msg || "Gagal menyimpan." };
  }
  revalidatePath("/settings");
  revalidatePath("/customers");
  revalidatePath("/pos");
  return { ok: true, message: "Program poin disimpan." };
}

/**
 * Jadwal mulai program poin (`startDate` "YYYY-MM-DD" WIB, null = mulai SEKARANG)
 * + opsi nolkan saldo semua pelanggan.
 *
 * Tanggal mulai TIDAK PERNAH lebih awal dari saat ini: ia juga batas "poin penjualan
 * lama" (void/retur penjualan sebelum batas tak menyentuh saldo). Batas yang lebih
 * awal dari reset akan membuat void penjualan pra-reset memotong saldo baru.
 */
export async function setLoyaltyScheduleAction(
  startDate: string | null,
  resetBalances: boolean,
): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: "Tidak punya izin." };
  const now = new Date();
  let startAt = now;
  if (startDate) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) return { ok: false, message: "Tanggal mulai tidak valid." };
    const [y, m, d] = startDate.split("-").map(Number);
    const chosen = startOfDay(y, m - 1, d); // 00:00 WIB
    if (chosen > now) startAt = chosen;
  }
  try {
    const r = await svc.setLoyaltySchedule(ctx.tenantId, startAt, resetBalances);
    revalidatePath("/settings");
    revalidatePath("/customers", "layout");
    revalidatePath("/pos");
    const parts = [startAt > now ? "Jadwal mulai program disimpan" : "Program poin berjalan mulai sekarang"];
    if (resetBalances) parts.push(`saldo ${r.resetCount} pelanggan dinolkan`);
    return { ok: true, message: parts.join(" · ") + "." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/column|does not exist|P2022/i.test(msg)) {
      return { ok: false, message: "Database produksi belum dimigrasi (kolom jadwal poin belum ada)." };
    }
    return { ok: false, message: msg || "Gagal menyimpan." };
  }
}

/** Tautkan tiket servis lama (tanpa pelanggan) ke member berdasarkan No. HP yang sama. */
export async function linkHistoryByPhoneAction(): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  try {
    const r = await svc.linkHistoryByPhone(ctx.tenantId);
    revalidatePath("/customers");
    revalidatePath("/service", "layout");
    return {
      ok: true,
      message: r.tickets > 0 ? `${r.tickets} tiket servis lama ditautkan ke member.` : "Tidak ada tiket lama yang cocok untuk ditautkan.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menautkan riwayat." };
  }
}

/* ── Portal Pelanggan (link pribadi /member/<token>) ── */

type PortalResult = { ok: boolean; token?: string | null; message?: string };

function portalError(e: unknown): PortalResult {
  const msg = e instanceof Error ? e.message : "";
  if (/portalToken|column .* does not exist/i.test(msg)) {
    return { ok: false, message: "Database produksi belum dimigrasi (kolom portal belum ada)." };
  }
  return { ok: false, message: msg || "Gagal memproses link portal." };
}

/** Buat link portal bila belum ada (dipakai tombol "Buat link" / "Kirim via WA"). */
export async function ensurePortalLinkAction(customerId: string): Promise<PortalResult> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  try {
    const token = await portal.ensurePortalToken(ctx.tenantId, customerId);
    if (!token) return { ok: false, message: "Pelanggan tidak ditemukan / nonaktif." };
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, token };
  } catch (e) {
    return portalError(e);
  }
}

/** Buat ulang link — link lama langsung tak berlaku (mis. link tersebar ke orang lain). */
export async function regeneratePortalLinkAction(customerId: string): Promise<PortalResult> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  try {
    const token = await portal.regeneratePortalToken(ctx.tenantId, customerId);
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, token, message: "Link baru dibuat. Link lama tidak berlaku lagi." };
  } catch (e) {
    return portalError(e);
  }
}

export async function revokePortalLinkAction(customerId: string): Promise<PortalResult> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  try {
    await portal.revokePortalToken(ctx.tenantId, customerId);
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, token: null, message: "Link portal dinonaktifkan." };
  } catch (e) {
    return portalError(e);
  }
}
