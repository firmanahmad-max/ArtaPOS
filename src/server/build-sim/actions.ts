"use server";

import { revalidatePath } from "next/cache";
import { revalidateReports } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { buildSimSchema } from "@/lib/validations/build-sim";
import type { SimStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/build-sim/service";

const NO_PERM = "Anda tidak punya izin mengelola simulasi rakitan.";

async function ctx() {
  const user = await getCurrentUser();
  return { user, allowed: can(user.role, "pcbuild.manage") };
}

export type SaveResult =
  | { ok: true; id: string }
  | { ok: false; message?: string; errors?: Record<string, string[]> };

/** Buat (id kosong) atau perbarui (id ada) simulasi dari payload editor. */
export async function saveSimulationAction(id: string | null, payload: unknown): Promise<SaveResult> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  const parsed = buildSimSchema.safeParse(payload);
  if (!parsed.success) {
    return { ok: false, errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  try {
    if (id) {
      await svc.updateSimulation(user.tenantId, id, parsed.data);
      revalidatePath(`/simulations/${id}`);
      revalidatePath("/simulations");
      return { ok: true, id };
    }
    const created = await svc.createSimulation(user.tenantId, { id: user.id, name: user.name }, parsed.data);
    revalidatePath("/simulations");
    return { ok: true, id: created.id };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menyimpan simulasi." };
  }
}

export async function deleteSimulationAction(id: string): Promise<{ ok: boolean; message?: string }> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.deleteSimulation(user.tenantId, id);
    revalidatePath("/simulations");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal menghapus." };
  }
}

export async function setSimStatusAction(id: string, status: SimStatus): Promise<{ ok: boolean; message?: string }> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.setSimStatus(user.tenantId, id, status);
    revalidatePath(`/simulations/${id}`);
    revalidatePath("/simulations");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export type ImportResult =
  | { ok: true; buildId: string; number: string; allocated: number; pending: number }
  | { ok: false; message?: string };

export async function importSimulationAction(id: string): Promise<ImportResult> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    const r = await svc.importToBuild(user.tenantId, { id: user.id, name: user.name }, id);
    revalidatePath(`/simulations/${id}`);
    revalidatePath("/simulations");
    revalidatePath("/pc-build");
    revalidatePath("/inventory");
    revalidateReports();
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal mengimpor." };
  }
}
