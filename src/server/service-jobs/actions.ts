"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { revalidateReports } from "@/lib/revalidate";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { toFieldErrors, type FormState } from "@/lib/form";
import { serviceTicketSchema } from "@/lib/validations/service";
import type { ServiceStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/service-jobs/service";

const NO_PERM = "Anda tidak punya izin mengelola servis.";
type Result = { ok: boolean; message?: string };

async function guard(): Promise<{ id: string; name: string } | null> {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) return null;
  return { id: user.id, name: user.name };
}

export async function createTicketAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const u = await guard();
  if (!u) return { message: NO_PERM };

  const parsed = serviceTicketSchema.safeParse({
    customerId: formData.get("customerId") || undefined,
    customerName: formData.get("customerName"),
    customerPhone: formData.get("customerPhone") || undefined,
    deviceType: formData.get("deviceType"),
    deviceBrand: formData.get("deviceBrand") || undefined,
    deviceInfo: formData.get("deviceInfo") || undefined,
    complaint: formData.get("complaint"),
    technicianId: formData.get("technicianId") || undefined,
    laborCost: formData.get("laborCost") ?? 0,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) return { errors: toFieldErrors(parsed.error) };

  let id: string;
  const userCtx = await getCurrentUser();
  try {
    const t = await svc.createTicket(userCtx.tenantId, u, parsed.data);
    id = t.id;
  } catch (e) {
    return { message: e instanceof Error ? e.message : "Gagal membuat tiket." };
  }
  revalidatePath("/service");
  redirect(`/service/${id}`);
}

export async function addPartAction(ticketId: string, productId: string, qty: number): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.addPart(user.tenantId, u.id, ticketId, productId, qty);
    revalidatePath(`/service/${ticketId}`);
    revalidatePath("/inventory");
    revalidateReports();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function addLineAction(ticketId: string, name: string, price: number, qty: number): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.addLine(user.tenantId, ticketId, name, price, qty);
    revalidatePath(`/service/${ticketId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function removeItemAction(ticketId: string, itemId: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.removeItem(user.tenantId, u.id, ticketId, itemId);
    revalidatePath(`/service/${ticketId}`);
    revalidatePath("/inventory");
    revalidateReports();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function updateLaborAction(ticketId: string, laborCost: number): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.updateLabor(user.tenantId, ticketId, laborCost);
    revalidatePath(`/service/${ticketId}`);
    revalidateReports();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function updateStatusAction(
  ticketId: string,
  status: ServiceStatus,
  diagnosis?: string,
): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.updateStatus(user.tenantId, ticketId, status, diagnosis);
    revalidatePath(`/service/${ticketId}`);
    revalidatePath("/service");
    revalidateReports();
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function addServicePhotoAction(ticketId: string, dataUrl: string, caption: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.addServicePhoto(user.tenantId, u.id, ticketId, dataUrl, caption || undefined);
    revalidatePath(`/service/${ticketId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

export async function removeServicePhotoAction(ticketId: string, photoId: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  const user = await getCurrentUser();
  try {
    await svc.removeServicePhoto(user.tenantId, ticketId, photoId);
    revalidatePath(`/service/${ticketId}`);
    return { ok: true };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}

const PAYMENT_METHODS = ["CASH", "TRANSFER", "QRIS", "CREDIT"] as const;
type PaymentMethodVal = (typeof PAYMENT_METHODS)[number];

export async function recordServicePaymentAction(
  ticketId: string,
  amount: number,
  method: string,
): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  if (!PAYMENT_METHODS.includes(method as PaymentMethodVal)) {
    return { ok: false, message: "Metode pembayaran tidak valid." };
  }
  const user = await getCurrentUser();
  try {
    const r = await svc.recordPayment(user.tenantId, ticketId, amount, method as PaymentMethodVal);
    revalidatePath(`/service/${ticketId}`);
    revalidateReports();
    return { ok: true, message: r.outstanding > 0 ? `Sisa: ${r.outstanding}` : "Lunas." };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal." };
  }
}
