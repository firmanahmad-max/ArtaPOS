"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/guard";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { isReportKind } from "@/lib/report-schedule";
import * as svc from "@/server/scheduled-reports/service";

const NO_PERM = "Anda tidak punya izin melihat laporan keuangan.";

function migrationMessage(e: unknown, fallback: string) {
  const msg = e instanceof Error ? e.message : String(e);
  if (/column|does not exist|P2021|P2022/i.test(msg)) {
    return "Database produksi belum dimigrasi (laporan terjadwal belum aktif).";
  }
  return msg || fallback;
}

/** Hitung isi laporan periode (untuk Kirim via WA / Pratinjau). */
export async function prepareReportAction(
  kind: string,
  periodKey: string,
): Promise<{ ok: boolean; text?: string; phone?: string | null; message?: string }> {
  const user = await getCurrentUser();
  if (!can(user.role, "finance.view")) return { ok: false, message: NO_PERM };
  if (!isReportKind(kind)) return { ok: false, message: "Jenis laporan tidak valid." };
  try {
    const r = await svc.buildReport(user.tenantId, user.tenant.name, kind, periodKey);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: migrationMessage(e, "Gagal menyusun laporan.") };
  }
}

/** Tandai laporan periode ini sudah dikirim / dilewati (hilang dari Dashboard). */
export async function markReportAction(
  kind: string,
  periodKey: string,
  status: "SENT" | "SKIPPED",
): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "finance.view")) return { ok: false, message: NO_PERM };
  if (!isReportKind(kind) || (status !== "SENT" && status !== "SKIPPED")) {
    return { ok: false, message: "Data tidak valid." };
  }
  try {
    await svc.markReport(ctx.tenantId, ctx.userId, kind, periodKey, status);
  } catch (e) {
    return { ok: false, message: migrationMessage(e, "Gagal menyimpan.") };
  }
  revalidatePath("/dashboard");
  revalidatePath("/settings");
  return { ok: true };
}

/** Simpan jadwal laporan & nomor WA penerima. */
export async function updateReportSettingsAction(input: {
  daily: boolean;
  weekly: boolean;
  monthly: boolean;
  dailyHour: number;
  phone: string;
}): Promise<{ ok: boolean; message?: string }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: "Tidak punya izin." };
  if (!Number.isInteger(input.dailyHour) || input.dailyHour < 0 || input.dailyHour > 23) {
    return { ok: false, message: "Jam laporan harian harus 0–23." };
  }
  const phone = (input.phone ?? "").trim();
  if (phone && !/^\+?[0-9][0-9\s-]{7,19}$/.test(phone)) {
    return { ok: false, message: "No. WhatsApp tidak valid (contoh: 0812xxxxxxx)." };
  }
  try {
    await svc.updateReportSettings(ctx.tenantId, {
      daily: !!input.daily,
      weekly: !!input.weekly,
      monthly: !!input.monthly,
      dailyHour: input.dailyHour,
      phone: phone || null,
    });
  } catch (e) {
    return { ok: false, message: migrationMessage(e, "Gagal menyimpan.") };
  }
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { ok: true, message: "Jadwal laporan disimpan." };
}
