"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { rmaClaimSchema, rmaReceiveSchema } from "@/lib/validations/rma";
import * as svc from "@/server/rma/service";

const NO_PERM = "Anda tidak punya izin mengelola RMA.";
type Result = { ok: boolean; message?: string };

async function guard(): Promise<{ id: string; tenantId: string } | null> {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) return null;
  return { id: user.id, tenantId: user.tenantId };
}

export async function createRmaAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const u = await guard();
  if (!u) return { message: NO_PERM };

  const parsed = rmaClaimSchema.safeParse({
    warrantyUnitId: formData.get("warrantyUnitId") || undefined,
    productId: formData.get("productId") || undefined,
    productName: formData.get("productName"),
    serialNumber: formData.get("serialNumber") || undefined,
    complaint: formData.get("complaint"),
    supplierId: formData.get("supplierId") || undefined,
    supplierName: formData.get("supplierName"),
    trackingNumber: formData.get("trackingNumber") || undefined,
    sentAt: formData.get("sentAt") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  let id: string;
  try {
    const r = await svc.createRmaClaim(u.tenantId, u.id, parsed.data);
    id = r.id;
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuat klaim RMA." };
  }
  revalidatePath("/rma");
  redirect(`/rma/${id}`);
}

export async function receiveRmaAction(
  rmaId: string,
  input: { resolution: string; receivedAt?: string; replacementSn?: string; note?: string },
): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const parsed = rmaReceiveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: parsed.error.issues[0]?.message ?? "Input tidak valid." };
  }
  try {
    await svc.receiveRmaClaim(u.tenantId, rmaId, parsed.data);
    revalidatePath(`/rma/${rmaId}`);
    revalidatePath("/rma");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function rejectRmaAction(rmaId: string, note?: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await svc.rejectRmaClaim(u.tenantId, rmaId, note);
    revalidatePath(`/rma/${rmaId}`);
    revalidatePath("/rma");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function reopenRmaAction(rmaId: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await svc.reopenRmaClaim(u.tenantId, rmaId);
    revalidatePath(`/rma/${rmaId}`);
    revalidatePath("/rma");
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function updateRmaNoteAction(rmaId: string, note: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await svc.updateRmaNote(u.tenantId, rmaId, note.slice(0, 1000));
    revalidatePath(`/rma/${rmaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function addRmaPhotoAction(rmaId: string, dataUrl: string, caption: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await svc.addRmaPhoto(u.tenantId, u.id, rmaId, dataUrl, caption || undefined);
    revalidatePath(`/rma/${rmaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function removeRmaPhotoAction(rmaId: string, photoId: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await svc.removeRmaPhoto(u.tenantId, rmaId, photoId);
    revalidatePath(`/rma/${rmaId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}
