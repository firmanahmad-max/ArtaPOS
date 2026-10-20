"use server";

import { revalidatePath } from "next/cache";
import { revalidateReports } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { consignmentSchema, commissionSchema, setComponentsSchema } from "@/lib/validations/consignment";
import type { ConsignmentItemStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/consignment/service";

const NO_PERM = "Anda tidak punya izin mengelola titip jual.";
const STATUSES: ConsignmentItemStatus[] = ["AVAILABLE", "SOLD", "RETURNED"];

type Result = { ok: boolean; message?: string };

async function guard() {
  const user = await getCurrentUser();
  return can(user.role, "inventory.manage") ? user : null;
}

function refresh(id?: string) {
  if (id) revalidatePath(`/consignments/${id}`);
  revalidatePath("/consignments");
  revalidatePath("/pos");
  revalidatePath("/gallery"); // barang titipan yang dipajang ikut berubah (harga/visibilitas)
}

const fail = (e: unknown, fallback: string): Result => ({
  ok: false,
  message: e instanceof Error ? e.message : fallback,
});

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
    refresh();
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
    refresh(id);
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal mengubah status.");
  }
}

export async function updateConsignmentItemTermsAction(
  itemId: string,
  terms: { askingPrice: number; commissionType: string; commissionValue: number },
): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  const parsed = commissionSchema.safeParse({
    commissionType: terms.commissionType,
    commissionValue: Math.round(Number(terms.commissionValue)),
  });
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Komisi tidak valid." };
  try {
    const id = await svc.updateItemTerms(user.tenantId, itemId, {
      askingPrice: Math.round(Number(terms.askingPrice)),
      ...parsed.data,
    });
    refresh(id);
    return { ok: true, message: "Harga & komisi diperbarui." };
  } catch (e) {
    return fail(e, "Gagal mengubah harga & komisi.");
  }
}

export async function updateConsignmentItemComponentsAction(itemId: string, components: unknown): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  const parsed = setComponentsSchema.safeParse(components);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Rincian isi tidak valid." };
  try {
    const id = await svc.updateItemComponents(user.tenantId, itemId, parsed.data);
    refresh(id);
    return {
      ok: true,
      message: parsed.data.length ? "Isi paket diperbarui." : "Rincian dihapus — kini barang tunggal.",
    };
  } catch (e) {
    return fail(e, "Gagal mengubah isi paket.");
  }
}

export async function setOwnerPaidAction(itemId: string, paid: boolean): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    const id = await svc.setOwnerPaid(user.tenantId, itemId, paid);
    refresh(id);
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal mencatat pembayaran hak pemilik.");
  }
}

export async function payAllOwnerAction(consignmentId: string): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    const n = await svc.payAllOwner(user.tenantId, consignmentId);
    refresh(consignmentId);
    return { ok: true, message: `${n} hak pemilik ditandai sudah dibayar.` };
  } catch (e) {
    return fail(e, "Gagal mencatat pembayaran hak pemilik.");
  }
}

export async function deleteConsignmentAction(id: string): Promise<Result> {
  const user = await guard();
  if (!user) return { ok: false, message: NO_PERM };
  try {
    await svc.deleteConsignment(user.tenantId, id);
    refresh();
    revalidateReports();
    return { ok: true };
  } catch (e) {
    return fail(e, "Gagal menghapus.");
  }
}
