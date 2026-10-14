"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { consignmentSchema } from "@/lib/validations/consignment";
import type { ConsignmentItemStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/consignment/service";

const NO_PERM = "Anda tidak punya izin mengelola titip jual.";
const STATUSES: ConsignmentItemStatus[] = ["AVAILABLE", "SOLD", "RETURNED"];

type Result = { ok: boolean; message?: string };

async function guard() {
  const user = await getCurrentUser();
  return can(user.role, "inventory.manage") ? user : null;
}

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; message?: string; errors?: Record<string, string[]> };

export async function createConsignmentAction(payload: unknown): Promise<CreateResult> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  const parsed = consignmentSchema.safeParse(payload);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: first?.message ?? "Data tidak valid.",
      errors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  try {
    const c = await svc.createConsignment(user.tenantId, user.id, parsed.data);
    revalidatePath("/consignments");
    return { ok: true, id: c.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan titip jual." };
  }
}

export async function setConsignmentItemStatusAction(
  itemId: string,
  status: ConsignmentItemStatus,
  soldPrice?: number,
): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  if (!STATUSES.includes(status)) return { ok: false, message: "Status tidak valid." };
  try {
    const id = await svc.setItemStatus(user.tenantId, itemId, status, soldPrice);
    revalidatePath(`/consignments/${id}`);
    revalidatePath("/consignments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal mengubah status." };
  }
}

export async function updateConsignmentItemPriceAction(itemId: string, askingPrice: number): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    const id = await svc.updateItemPrice(user.tenantId, itemId, Math.round(Number(askingPrice)));
    revalidatePath(`/consignments/${id}`);
    revalidatePath("/consignments");
    return { ok: true, message: "Harga diperbarui." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal mengubah harga." };
  }
}

export async function deleteConsignmentAction(id: string): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    await svc.deleteConsignment(user.tenantId, id);
    revalidatePath("/consignments");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus." };
  }
}
