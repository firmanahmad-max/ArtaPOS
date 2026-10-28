"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/dal";
import { can, type Permission } from "@/lib/rbac";
import type { ReviewSource, TestimonialStatus } from "@/generated/prisma/enums";
import * as svc from "@/server/reviews/service";

type Result = { ok: boolean; message?: string };

const SOURCES: ReviewSource[] = ["SERVICE", "BUILD", "SALE"];
const PERM: Record<ReviewSource, Permission> = { SERVICE: "service.manage", BUILD: "pcbuild.manage", SALE: "pos.use" };

/** Tabel ulasan belum dimigrasi → pesan ramah. */
function friendly(e: unknown, fallback: string): string {
  const msg = e instanceof Error ? e.message : "";
  if (/reviews|googleReviewUrl|does not exist/i.test(msg)) {
    return "Fitur ulasan belum aktif di database (migrasi belum dijalankan).";
  }
  return msg || fallback;
}

function refresh() {
  revalidatePath("/reviews");
  revalidatePath("/dashboard");
}

/**
 * Siapkan link ulasan untuk satu dokumen (dibuat bila belum ada) → klien membuka WA.
 * Izin mengikuti modul dokumennya (servis / rakit PC / kasir).
 */
export async function requestReviewAction(
  source: string,
  id: string,
): Promise<
  | { ok: true; token: string; phone: string | null; customerName: string | null; docNumber: string; alreadySubmitted: boolean }
  | { ok: false; message: string }
> {
  const user = await getCurrentUser();
  if (!SOURCES.includes(source as ReviewSource)) return { ok: false, message: "Jenis dokumen tidak valid." };
  const src = source as ReviewSource;
  if (!can(user.role, PERM[src]) && !can(user.role, "reports.view")) {
    return { ok: false, message: "Anda tidak punya izin meminta ulasan." };
  }
  try {
    const r = await svc.ensureReviewRequest(user.tenantId, { source: src, id });
    refresh();
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal menyiapkan link ulasan.") };
  }
}

export async function setTestimonialAction(id: string, status: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) return { ok: false, message: "Tidak punya izin." };
  if (!["PENDING", "APPROVED", "HIDDEN"].includes(status)) return { ok: false, message: "Status tidak valid." };
  try {
    await svc.setTestimonialStatus(user.tenantId, id, status as TestimonialStatus);
    refresh();
    revalidatePath("/galeri", "layout");
    return { ok: true, message: status === "APPROVED" ? "Testimoni tampil di Galeri Publik." : "Testimoni disembunyikan." };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal mengubah testimoni.") };
  }
}

export async function setFollowUpAction(id: string, done: boolean, note?: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) return { ok: false, message: "Tidak punya izin." };
  try {
    await svc.setFollowUp(user.tenantId, id, done, note);
    refresh();
    return { ok: true, message: done ? "Ditandai sudah ditindaklanjuti." : "Dibuka kembali." };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal menyimpan.") };
  }
}

export async function updateGoogleReviewUrlAction(url: string): Promise<Result> {
  const user = await getCurrentUser();
  if (!can(user.role, "settings.manage")) return { ok: false, message: "Hanya pengelola pengaturan yang bisa mengubah link ini." };
  try {
    await svc.updateGoogleReviewUrl(user.tenantId, url);
    refresh();
    return { ok: true, message: url.trim() ? "Link ulasan Google disimpan." : "Link ulasan Google dihapus." };
  } catch (e) {
    return { ok: false, message: friendly(e, "Gagal menyimpan.") };
  }
}

// ── Publik (tanpa login; dibatasi oleh token 192-bit) ──────────────────────

export async function submitReviewAction(
  token: string,
  input: { rating: number; comment?: string; allowPublic?: boolean },
): Promise<{ ok: true; outcome: "google" | "thanks" | "followup"; googleUrl: string | null } | { ok: false; message: string }> {
  try {
    const r = await svc.submitReview(token, {
      rating: Number(input?.rating),
      comment: typeof input?.comment === "string" ? input.comment : null,
      allowPublic: input?.allowPublic === true,
    });
    revalidatePath("/reviews");
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Gagal mengirim ulasan." };
  }
}

export async function recordGoogleClickAction(token: string): Promise<void> {
  try {
    await svc.recordGoogleClick(token);
  } catch {
    /* best-effort */
  }
}
