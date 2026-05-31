"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import {
  purchaseSchema,
  purchasePaymentSchema,
  type PurchaseInput,
} from "@/lib/validations/purchasing";
import { createPurchase, recordPurchasePayment } from "@/server/purchasing/service";

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
