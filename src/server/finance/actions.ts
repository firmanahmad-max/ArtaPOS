"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { expenseSchema } from "@/lib/validations/finance";
import { createExpense, deleteExpense } from "@/server/finance/service";

const NO_PERM = "Anda tidak punya izin mengelola keuangan.";

export async function createExpenseAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "finance.view")) return { message: NO_PERM };

  const parsed = expenseSchema.safeParse({
    category: formData.get("category"),
    description: formData.get("description") || undefined,
    amount: formData.get("amount"),
    date: formData.get("date") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  try {
    await createExpense(user.tenantId, user.id, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menyimpan biaya." };
  }
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
  return { ok: true, message: "Biaya dicatat." };
}

export async function deleteExpenseAction(id: string): Promise<void> {
  const user = await getCurrentUser();
  if (!can(user.role, "finance.view")) throw new Error(NO_PERM);
  await deleteExpense(user.tenantId, id);
  revalidatePath("/finance/expenses");
  revalidatePath("/finance");
}
