"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import * as svc from "@/server/referrals/service";

type Result = { ok: boolean; message?: string };

function friendly(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  if (/referral|does not exist/i.test(msg) && !/ajak/i.test(msg)) {
    return "Program Ajak Teman belum aktif di database (migrasi belum dijalankan).";
  }
  return msg || fallback;
}

function refresh() {
  revalidatePath("/referrals");
  revalidatePath("/customers", "layout");
}

export async function updateReferralConfigAction(input: {
  enabled: boolean;
  referrerPoints: number;
  friendPoints: number;
  minPurchase: number;
  validDays: number;
}): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "settings.manage")) return { ok: false, message: "Hanya pengelola pengaturan yang bisa mengubah program ini." };
  try {
    await svc.updateReferralConfig(user.tenantId, {
      enabled: !!input.enabled,
      referrerPoints: Math.round(Number(input.referrerPoints)),
      friendPoints: Math.round(Number(input.friendPoints)),
      minPurchase: Math.round(Number(input.minPurchase)),
      validDays: Math.round(Number(input.validDays)),
    });
    refresh();
    revalidatePath("/member", "layout");
    return { ok: true, message: input.enabled ? "Program Ajak Teman aktif." : "Pengaturan disimpan (program nonaktif)." };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal menyimpan.") };
  }
}

/** Tautkan pelanggan baru ke pengajak lewat kode (teman datang langsung ke toko). */
export async function linkReferralCodeAction(customerId: string, code: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) return { ok: false, message: "Tidak punya izin." };
  try {
    const r = await svc.linkReferralByCode(user.tenantId, customerId, code);
    refresh();
    return { ok: true, message: `Tercatat diajak oleh ${r.referrerName}. Bonus diberikan setelah transaksi pertama lunas.` };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal menautkan kode.") };
  }
}

export async function cancelReferralAction(id: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) return { ok: false, message: "Tidak punya izin." };
  try {
    await svc.cancelReferral(user.tenantId, id);
    refresh();
    return { ok: true, message: "Ajakan dibatalkan." };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal membatalkan.") };
  }
}

// ── Publik (tanpa login) ───────────────────────────────────────────────────

export async function registerFriendAction(
  slug: string,
  code: string,
  input: { name: string; phone: string; consent: boolean; website?: string },
): Promise<{ ok: true; validDays: number } | { ok: false; message: string }> {
  // Honeypot: bot mengisi kolom tersembunyi → pura-pura sukses tanpa menyimpan.
  if (input?.website) return { ok: true, validDays: 0 };
  try {
    const r = await svc.registerReferredFriend(String(slug), String(code), {
      name: String(input?.name ?? ""),
      phone: String(input?.phone ?? "").slice(0, 30),
      consent: input?.consent === true,
    });
    revalidatePath("/referrals");
    return { ok: true, validDays: r.validDays };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Pendaftaran gagal." };
  }
}
