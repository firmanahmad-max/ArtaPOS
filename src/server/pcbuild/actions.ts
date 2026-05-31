"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { pcBuildSchema } from "@/lib/validations/pcbuild";
import type { BuildStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/pcbuild/service";

const NO_PERM = "Anda tidak punya izin mengelola rakit PC.";
type Result = { ok: boolean; message?: string };

async function ctx() {
  const user = await getCurrentUser();
  return { user, allowed: can(user.role, "pcbuild.manage") };
}

export async function createBuildAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user, allowed } = await ctx();
  if (!allowed) return { message: NO_PERM };
  const parsed = pcBuildSchema.safeParse({
    name: formData.get("name"),
    customerId: formData.get("customerId") || undefined,
    customerName: formData.get("customerName") || undefined,
    buildFee: formData.get("buildFee") ?? 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };
  let id: string;
  try {
    const b = await svc.createBuild(user.tenantId, { id: user.id, name: user.name }, parsed.data);
    id = b.id;
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuat rakitan." };
  }
  revalidatePath("/pc-build");
  redirect(`/pc-build/${id}`);
}

export async function addComponentAction(buildId: string, productId: string, qty: number): Promise<Result> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.addComponent(user.tenantId, user.id, buildId, productId, qty);
    revalidatePath(`/pc-build/${buildId}`);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function removeComponentAction(buildId: string, itemId: string): Promise<Result> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.removeComponent(user.tenantId, user.id, buildId, itemId);
    revalidatePath(`/pc-build/${buildId}`);
    revalidatePath("/inventory");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function updateBuildFeeAction(buildId: string, buildFee: number): Promise<Result> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.updateBuildFee(user.tenantId, buildId, buildFee);
    revalidatePath(`/pc-build/${buildId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function updateBuildStatusAction(buildId: string, status: BuildStatus): Promise<Result> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    await svc.updateStatus(user.tenantId, buildId, status);
    revalidatePath(`/pc-build/${buildId}`);
    revalidatePath("/pc-build");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function recordBuildPaymentAction(buildId: string, amount: number): Promise<Result> {
  const { user, allowed } = await ctx();
  if (!allowed) return { ok: false, message: NO_PERM };
  try {
    const r = await svc.recordPayment(user.tenantId, buildId, amount);
    revalidatePath(`/pc-build/${buildId}`);
    return { ok: true, message: r.outstanding > 0 ? `Sisa: ${r.outstanding}` : "Lunas." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}
