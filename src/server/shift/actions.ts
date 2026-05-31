"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import type { FormState } from "@/lib/form";
import { openShift, closeShift } from "@/server/shift/service";

const cashSchema = z.coerce.number().int("Harus angka").min(0, "Tidak boleh negatif");

export async function openShiftAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) return { message: "Tidak punya izin." };

  const parsed = cashSchema.safeParse(formData.get("openingCash"));
  if (!parsed.success) return { errors: { openingCash: [parsed.error.issues[0].message] } };

  try {
    await openShift(user.tenantId, { id: user.id, name: user.name }, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuka shift." };
  }
  revalidatePath("/shift");
  return { ok: true, message: "Shift dibuka." };
}

export async function closeShiftAction(
  shiftId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await getCurrentUser();
  if (!can(user.role, "pos.use")) return { message: "Tidak punya izin." };

  const parsed = cashSchema.safeParse(formData.get("closingCash"));
  if (!parsed.success) return { errors: { closingCash: [parsed.error.issues[0].message] } };

  try {
    await closeShift(user.tenantId, user.id, shiftId, parsed.data);
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal menutup shift." };
  }
  revalidatePath("/shift");
  return { ok: true, message: "Shift ditutup." };
}
