"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { contactSchema } from "@/lib/validations/contacts";
import * as svc from "@/server/customers/service";

const NO_PERM = "Anda tidak punya izin mengelola pelanggan.";

function parse(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
  });
}

export async function createCustomerAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.createCustomer(ctx.tenantId, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/customers");
  return { ok: true, message: "Pelanggan ditambahkan." };
}

export async function updateCustomerAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.updateCustomer(ctx.tenantId, id, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/customers");
  redirect("/customers");
}

export async function deactivateCustomerAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) throw new Error(NO_PERM);
  await svc.deactivateCustomer(ctx.tenantId, id);
  revalidatePath("/customers");
}

export async function adjustPointsAction(
  customerId: string,
  points: number,
  type: "REDEEM" | "ADJUST",
  note: string,
): Promise<{ ok: boolean; message?: string; balance?: number }> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "pos.use")) return { ok: false, message: NO_PERM };
  if (!Number.isFinite(points) || points <= 0) return { ok: false, message: "Jumlah poin tidak valid." };
  try {
    const r = await svc.adjustPoints(ctx.tenantId, customerId, points, type, note || undefined);
    revalidatePath(`/customers/${customerId}/edit`);
    return { ok: true, balance: r.balance };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}
