"use server";

import { revalidatePath } from "next/cache";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { validateDailyItem, type DailyKind } from "@/lib/daily-content";
import * as svc from "@/server/daily-content/service";

type Result = { ok: boolean; message?: string; errors?: Record<string, string> };
const NO_PERM = "Anda tidak punya izin mengelola konten harian.";
const KINDS: DailyKind[] = ["motivasi", "tips", "fakta", "gaming", "promo"];

function parse(raw: unknown): { input?: svc.DailyContentInput; errors?: Record<string, string> } {
  const r = (raw ?? {}) as Record<string, unknown>;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const kind = KINDS.includes(r.kind as DailyKind) ? (r.kind as DailyKind) : null;
  if (!kind) return { errors: { kind: "Jenis konten tidak valid." } };
  const input: svc.DailyContentInput = {
    kind,
    title: str(r.title),
    emphasis: str(r.emphasis) || null,
    body: str(r.body),
    steps: Array.isArray(r.steps) ? r.steps.slice(0, 3).map(str) : [],
    cta: str(r.cta),
    startsOn: str(r.startsOn) || null,
    endsOn: str(r.endsOn) || null,
    isActive: typeof r.isActive === "boolean" ? r.isActive : undefined,
    productId: kind === "promo" ? str(r.productId) || null : null,
    promoPrice: typeof r.promoPrice === "number" && r.promoPrice > 0 ? Math.round(r.promoPrice) : null,
  };
  const errors = validateDailyItem(input);
  return Object.keys(errors).length ? { errors } : { input };
}

function fail(e: unknown): Result {
  const msg = e instanceof Error ? e.message : "";
  if (/daily_content|does not exist|P2021/i.test(msg)) {
    return { ok: false, message: "Database produksi belum dimigrasi (konten harian kustom belum aktif)." };
  }
  return { ok: false, message: msg || "Gagal menyimpan." };
}

function revalidate() {
  revalidatePath("/daily-content");
  revalidatePath("/dashboard");
}

export async function saveDailyContentAction(id: string | null, raw: unknown): Promise<Result> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: NO_PERM };
  const { input, errors } = parse(raw);
  if (!input) return { ok: false, errors, message: "Periksa kembali isian." };
  try {
    if (id) await svc.updateDailyContent(ctx.tenantId, id, input);
    else await svc.createDailyContent(ctx.tenantId, ctx.userId, input);
  } catch (e) {
    return fail(e);
  }
  revalidate();
  return { ok: true, message: id ? "Konten diperbarui." : "Konten ditambahkan — ikut bergilir di Dashboard." };
}

export async function toggleDailyContentAction(id: string, isActive: boolean): Promise<Result> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: NO_PERM };
  try {
    await svc.setDailyContentActive(ctx.tenantId, id, isActive);
  } catch (e) {
    return fail(e);
  }
  revalidate();
  return { ok: true };
}

export async function deleteDailyContentAction(id: string): Promise<Result> {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return { ok: false, message: NO_PERM };
  try {
    await svc.deleteDailyContent(ctx.tenantId, id);
  } catch (e) {
    return fail(e);
  }
  revalidate();
  return { ok: true, message: "Konten dihapus." };
}

/** Catat pemakaian konten (dipanggil klien setelah bagikan/unduh/salin; best-effort). */
export async function recordDailyContentAction(contentKey: string, action: string): Promise<void> {
  const ctx = await getAuthContext();
  if (action !== "SHARE" && action !== "DOWNLOAD" && action !== "COPY") return;
  if (typeof contentKey !== "string" || contentKey.length > 80) return;
  try {
    await svc.recordDailyContentUse(ctx.tenantId, contentKey, action, Date.now());
  } catch {
    /* statistik tak boleh mengganggu pengguna */
  }
}

/** Cari produk untuk ditautkan ke promo (form Konten Harian). */
export async function searchPromoProductsAction(q: string) {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "settings.manage")) return [];
  try {
    return await svc.searchPromoProducts(ctx.tenantId, typeof q === "string" ? q.slice(0, 60) : "");
  } catch {
    return [];
  }
}
