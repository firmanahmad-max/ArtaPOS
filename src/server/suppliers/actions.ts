"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { contactSchema } from "@/lib/validations/contacts";
import * as svc from "@/server/suppliers/service";

const NO_PERM = "Anda tidak punya izin mengelola supplier.";

function parse(formData: FormData) {
  return contactSchema.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
  });
}

export async function createSupplierAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "purchasing.manage")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.createSupplier(ctx.tenantId, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/suppliers");
  return { ok: true, message: "Supplier ditambahkan." };
}

export async function updateSupplierAction(
  id: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "purchasing.manage")) return { message: NO_PERM };
  const parsed = parse(formData);
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  try {
    await svc.updateSupplier(ctx.tenantId, id, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan." };
  }
  revalidatePath("/suppliers");
  redirect("/suppliers");
}

export async function deactivateSupplierAction(id: string): Promise<void> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "purchasing.manage")) throw new Error(NO_PERM);
  await svc.deactivateSupplier(ctx.tenantId, id);
  revalidatePath("/suppliers");
}
