"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/guard";
import { redeemPromoCode } from "@/server/license/service";
import { formatLocalDate } from "@/lib/timezone";

/** Toko menukar kode aktivasi lisensi (owner). */
export async function redeemPromoCodeAction(code: string): Promise<{ ok: boolean; message?: string }> {
  try {
    const ctx = await requirePermission("license.manage");
    const r = await redeemPromoCode(ctx.tenantId, code);
    revalidatePath("/settings");
    const until = r.validUntil ? ` berlaku s/d ${formatLocalDate(r.validUntil, { dateStyle: "medium" })}` : "";
    return { ok: true, message: `Berhasil! Lisensi kini ${r.plan}${until}.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menukar kode." };
  }
}
