"use server";

import { revalidatePath } from "next/cache";
import { revalidateReports } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { usedItemSchema } from "@/lib/validations/used-item";
import * as svc from "@/server/used-items/service";

const NO_PERM = "Anda tidak punya izin mengelola barang bekas.";

type Result = { ok: boolean; message?: string };
export type SaveResult = { ok: true; id: string } | { ok: false; message?: string };

async function guard() {
  const user = await getCurrentUser();
  return can(user.role, "inventory.manage") ? user : null;
}

function refresh(id?: string) {
  if (id) revalidatePath(`/used-items/${id}`);
  revalidatePath("/used-items");
  revalidatePath("/pos");
  revalidatePath("/gallery"); // barang yang dipajang ikut berubah (harga/visibilitas)
  revalidateReports(); // harga beli masuk ringkasan pembelian di Keuangan
}

const fail = (e: unknown, fallback: string): Result => ({
  ok: false,
  message: e instanceof Error ? e.message : fallback,
});

export async function saveUsedItemAction(id: string | null, payload: unknown): Promise<SaveResult> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  const parsed = usedItemSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    if (id) {
      await svc.updateUsedItem(user.tenantId, id, parsed.data);
      refresh(id);
      return { ok: true, id };
    }
    const it = await svc.createUsedItem(user.tenantId, user.id, parsed.data);
    refresh();
    return { ok: true, id: it.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan barang bekas." };
  }
}

export async function setUsedItemAvailabilityAction(id: string, available: boolean): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    await svc.setUsedItemAvailability(user.tenantId, id, available);
    refresh(id);
    return { ok: true, message: available ? "Barang dijual kembali" : "Barang ditarik dari penjualan" };
  } catch (e) {
    return fail(e, "Gagal mengubah status.");
  }
}

export async function deleteUsedItemAction(id: string): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    await svc.deleteUsedItem(user.tenantId, id);
    refresh();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus.");
  }
}
