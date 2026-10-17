"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import * as catalog from "@/server/service-catalog/service";
import * as reminders from "@/server/service-reminders/service";

type Result = { ok: boolean; message?: string };
const NO_PERM = "Anda tidak punya izin mengelola servis.";

async function guard() {
  const user = await getCurrentUser();
  return can(user.role, "service.manage") ? user : null;
}
const fail = (e: unknown, f: string): Result => ({ ok: false, message: e instanceof Error ? e.message : f });

function refresh() {
  revalidatePath("/service/catalog");
  revalidatePath("/service/reminders");
  revalidatePath("/service", "layout");
}

// ── Katalog jasa ──
export async function saveCatalogItemAction(
  id: string | null,
  input: { name: string; price: number; intervalMonths: number },
): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    if (id) await catalog.updateCatalogItem(u.tenantId, id, input);
    else await catalog.createCatalogItem(u.tenantId, input);
    refresh();
    return { ok: true, message: id ? "Jasa diperbarui." : "Jasa ditambahkan." };
  } catch (e) {
    return fail(e, "Gagal menyimpan jasa.");
  }
}

export async function setCatalogActiveAction(id: string, isActive: boolean): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await catalog.setCatalogActive(u.tenantId, id, isActive);
    refresh();
    return { ok: true, message: isActive ? "Jasa diaktifkan." : "Jasa dinonaktifkan." };
  } catch (e) {
    return fail(e, "Gagal.");
  }
}

export async function deleteCatalogItemAction(id: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await catalog.deleteCatalogItem(u.tenantId, id);
    refresh();
    return { ok: true, message: "Jasa dihapus." };
  } catch (e) {
    return fail(e, "Gagal menghapus.");
  }
}

export async function seedCatalogDefaultsAction(): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    const n = await catalog.seedCatalogDefaults(u.tenantId);
    refresh();
    return { ok: true, message: n > 0 ? `${n} contoh jasa ditambahkan.` : "Semua contoh jasa sudah ada." };
  } catch (e) {
    return fail(e, "Gagal.");
  }
}

// ── Pengingat ──
export async function setReminderStatusAction(
  sourceTicketId: string,
  catalogItemId: string,
  status: "REMINDED" | "SKIPPED",
): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await reminders.setReminderStatus(u.tenantId, u.id, sourceTicketId, catalogItemId, status);
    revalidatePath("/service/reminders");
    revalidatePath("/dashboard");
    revalidatePath("/insights");
    return { ok: true, message: status === "REMINDED" ? "Ditandai sudah diingatkan." : "Pengingat dilewati." };
  } catch (e) {
    return fail(e, "Gagal.");
  }
}

export async function clearReminderStatusAction(sourceTicketId: string, catalogItemId: string): Promise<Result> {
  const u = await guard();
  if (!u) return { ok: false, message: NO_PERM };
  try {
    await reminders.clearReminderStatus(u.tenantId, sourceTicketId, catalogItemId);
    revalidatePath("/service/reminders");
    return { ok: true, message: "Dikembalikan ke daftar pengingat." };
  } catch (e) {
    return fail(e, "Gagal.");
  }
}
