"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import type { FormState } from "@/lib/form";
import { opnameCountsSchema } from "@/lib/validations/inventory";
import * as svc from "@/server/opname/service";

const NO_PERM = "Anda tidak punya izin untuk stok opname.";

export async function createOpnameAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { message: NO_PERM };

  let id: string;
  try {
    const note = (formData.get("note") as string) || undefined;
    const opname = await svc.createOpname(ctx.tenantId, ctx.userId, note);
    id = opname.id;
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuat opname." };
  }
  revalidatePath("/inventory/opname");
  redirect(`/inventory/opname/${id}`);
}

export interface OpnameActionResult {
  ok: boolean;
  message?: string;
}

export async function saveOpnameCountsAction(
  opnameId: string,
  counts: { itemId: string; countedQty: number }[],
): Promise<OpnameActionResult> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: NO_PERM };
  const parsed = opnameCountsSchema.safeParse(counts);
  if (!parsed.success) {
    return { ok: false, message: "Hasil hitung tidak valid (jumlah harus bilangan bulat ≥ 0)." };
  }
  try {
    await svc.saveOpnameCounts(ctx.tenantId, opnameId, parsed.data);
    revalidatePath(`/inventory/opname/${opnameId}`);
    return { ok: true, message: "Hitungan tersimpan." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
}

export async function completeOpnameAction(
  opnameId: string,
): Promise<OpnameActionResult> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) return { ok: false, message: NO_PERM };
  try {
    const { adjusted } = await svc.completeOpname(ctx.tenantId, ctx.userId, opnameId);
    revalidatePath(`/inventory/opname/${opnameId}`);
    revalidatePath("/inventory");
    return { ok: true, message: `Opname selesai. ${adjusted} produk disesuaikan.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyelesaikan." };
  }
}
