"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import {
  purchaseSchema,
  purchaseHeaderSchema,
  purchasePaymentSchema,
  type PurchaseInput,
  type PurchaseHeaderInput,
} from "@/lib/validations/purchasing";
import {
  createPurchase,
  recordPurchasePayment,
  updatePurchaseHeader,
  deletePurchase,
  deletePurchasePayment,
} from "@/server/purchasing/service";

const NO_PERM = "Anda tidak punya izin mengelola pembelian.";

export interface PurchaseResult {
  ok: boolean;
  message?: string;
  purchaseId?: string;
  number?: string;
}

export async function createPurchaseAction(input: PurchaseInput): Promise<PurchaseResult> {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) return { ok: false, message: NO_PERM };

  const parsed = purchaseSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  }

  try {
    const p = await createPurchase(user.tenantId, { id: user.id, name: user.name }, parsed.data);
    revalidatePath("/purchasing");
    revalidatePath("/payables");
    revalidatePath("/inventory");
    return { ok: true, purchaseId: p.id, number: p.number };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan pembelian." };
  }
}

type Result = { ok: boolean; message?: string };

export async function updatePurchaseHeaderAction(
  purchaseId: string,
  input: PurchaseHeaderInput,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) return { ok: false, message: NO_PERM };
  const parsed = purchaseHeaderSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  try {
    await updatePurchaseHeader(user.tenantId, purchaseId, parsed.data);
    revalidatePath(`/purchasing/${purchaseId}`);
    revalidatePath("/purchasing");
    revalidatePath("/payables");
    return { ok: true, message: "Perubahan disimpan." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan perubahan." };
  }
}

export async function deletePurchaseAction(purchaseId: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) return { ok: false, message: NO_PERM };
  try {
    const r = await deletePurchase(user.tenantId, user.id, purchaseId);
    revalidatePath("/purchasing");
    revalidatePath("/payables");
    revalidatePath("/inventory");
    return { ok: true, message: `Pembelian ${r.number} dihapus, stok dikembalikan.` };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus pembelian." };
  }
}

export async function deletePurchasePaymentAction(
  purchaseId: string,
  paymentId: string,
): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) return { ok: false, message: NO_PERM };
  try {
    const r = await deletePurchasePayment(user.tenantId, purchaseId, paymentId);
    revalidatePath(`/purchasing/${purchaseId}`);
    revalidatePath("/payables");
    return {
      ok: true,
      message: r.outstanding > 0 ? `Pembayaran dihapus. Sisa utang: ${r.outstanding}.` : "Pembayaran dihapus.",
    };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus pembayaran." };
  }
}

export async function recordPaymentAction(
  purchaseId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "purchasing.manage")) return { message: NO_PERM };

  const parsed = purchasePaymentSchema.safeParse({
    amount: formData.get("amount"),
    note: formData.get("note"),
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    const r = await recordPurchasePayment(
      user.tenantId,
      user.id,
      purchaseId,
      parsed.data.amount,
      parsed.data.note || undefined,
    );
    revalidatePath(`/purchasing/${purchaseId}`);
    revalidatePath("/payables");
    return {
      ok: true,
      message: r.outstanding > 0 ? `Pembayaran tercatat. Sisa utang: ${r.outstanding}.` : "Utang lunas.",
    };
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal mencatat pembayaran." };
  }
}
