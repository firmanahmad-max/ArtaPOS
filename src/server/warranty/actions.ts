"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { warrantyRegisterSchema } from "@/lib/validations/warranty";
import { registerWarranty, claimWarranty } from "@/server/warranty/service";

const NO_PERM = "Anda tidak punya izin mengelola garansi.";

function friendly(e: unknown): string {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("Unique constraint") || (e as { code?: string })?.code === "P2002") {
    return "Nomor seri sudah terdaftar.";
  }
  return msg || "Terjadi kesalahan.";
}

export async function registerWarrantyAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) return { message: NO_PERM };

  const parsed = warrantyRegisterSchema.safeParse({
    productId: formData.get("productId") || undefined,
    productName: formData.get("productName"),
    serialNumber: formData.get("serialNumber"),
    customerId: formData.get("customerId") || undefined,
    customerName: formData.get("customerName") || undefined,
    saleNumber: formData.get("saleNumber") || undefined,
    soldAt: formData.get("soldAt") || undefined,
    warrantyMonths: formData.get("warrantyMonths") ?? 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await registerWarranty(user.tenantId, user.id, parsed.data);
  } catch (e) {
    return { message: friendly(e) };
  }
  revalidatePath("/warranty");
  return { ok: true, message: "Garansi terdaftar." };
}

export async function claimWarrantyAction(id: string, note: string): Promise<{ ok: boolean; message?: string }> {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) return { ok: false, message: NO_PERM };
  try {
    await claimWarranty(user.tenantId, id, note || undefined);
    revalidatePath("/warranty");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: friendly(e) };
  }
}
