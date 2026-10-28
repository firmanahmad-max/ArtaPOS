import "server-only";
import { cache } from "react";
import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";
import type { ReviewSource, TestimonialStatus } from "@/generated/prisma/enums";
import {
  cleanComment,
  GOOGLE_MIN_RATING,
  isGoogleReviewUrl,
  isReviewToken,
  reviewOutcome,
  shortName,
  summarizeReviews,
  validateReviewInput,
} from "@/lib/review";

/**
 * Service Ulasan & Testimoni — ter-scope tenantId (admin) atau token (publik).
 * Satu ulasan per dokumen (servis / rakitan / penjualan), dibuat MALAS saat toko
 * menekan "Minta ulasan". Halaman publik hanya bisa mengubah ulasan milik token itu.
 */

const newToken = () => randomBytes(24).toString("base64url");
const DONE_SERVICE = ["DONE", "DELIVERED"] as const;
const DONE_BUILD = ["DONE", "DELIVERED"] as const;

export interface ReviewDocRef {
  source: ReviewSource;
  id: string;
}

/** Data dokumen sumber (ter-scope tenant) + syarat siap diulas. */
async function loadDoc(tenantId: string, ref: ReviewDocRef) {
  if (ref.source === "SERVICE") {
    const t = await db.serviceTicket.findFirst({
      where: { id: ref.id, tenantId },
      select: { number: true, status: true, customerId: true, customerName: true, customerPhone: true },
    });
    if (!t) throw new Error("Tiket servis tidak ditemukan.");
    if (!DONE_SERVICE.includes(t.status as (typeof DONE_SERVICE)[number])) {
      throw new Error("Ulasan bisa diminta setelah servis Selesai/Diambil.");
    }
    const c =
      !t.customerPhone && t.customerId
        ? await db.customer.findFirst({ where: { id: t.customerId, tenantId }, select: { phone: true } })
        : null;
    return { docNumber: t.number, customerId: t.customerId, customerName: t.customerName, phone: t.customerPhone ?? c?.phone ?? null };
  }
  if (ref.source === "BUILD") {
    const b = await db.pcBuild.findFirst({
      where: { id: ref.id, tenantId },
      select: { number: true, status: true, customerId: true, customerName: true },
    });
    if (!b) throw new Error("Rakitan tidak ditemukan.");
    if (!DONE_BUILD.includes(b.status as (typeof DONE_BUILD)[number])) {
      throw new Error("Ulasan bisa diminta setelah rakitan Selesai/Diserahkan.");
    }
    const c = b.customerId
      ? await db.customer.findFirst({ where: { id: b.customerId, tenantId }, select: { phone: true } })
      : null;
    return { docNumber: b.number, customerId: b.customerId, customerName: b.customerName, phone: c?.phone ?? null };
  }
  const s = await db.sale.findFirst({
    where: { id: ref.id, tenantId },
    select: { number: true, status: true, customerId: true, customerName: true },
  });
  if (!s) throw new Error("Penjualan tidak ditemukan.");
  if (s.status !== "COMPLETED") throw new Error("Penjualan ini sudah dibatalkan.");
  const c = s.customerId
    ? await db.customer.findFirst({ where: { id: s.customerId, tenantId }, select: { phone: true } })
    : null;
  return { docNumber: s.number, customerId: s.customerId, customerName: s.customerName, phone: c?.phone ?? null };
}

const docWhere = (ref: ReviewDocRef) =>
  ref.source === "SERVICE"
    ? { serviceTicketId: ref.id }
    : ref.source === "BUILD"
      ? { pcBuildId: ref.id }
      : { saleId: ref.id };

/**
 * Siapkan permintaan ulasan untuk satu dokumen: buat baris + token bila belum ada
 * (aman balapan via unique dokumen), catat `requestedAt`. Kembalikan data pesan WA.
 */
export async function ensureReviewRequest(tenantId: string, ref: ReviewDocRef) {
  const doc = await loadDoc(tenantId, ref);
  const where = { tenantId, ...docWhere(ref) };
  let review = await db.review.findFirst({ where, select: { id: true, token: true, rating: true } });
  if (!review) {
    try {
      review = await db.review.create({
        data: {
          tenantId,
          token: newToken(),
          source: ref.source,
          ...docWhere(ref),
          docNumber: doc.docNumber,
          customerId: doc.customerId,
          customerName: doc.customerName,
          customerPhone: doc.phone,
        },
        select: { id: true, token: true, rating: true },
      });
    } catch (e) {
      // Dua klik bersamaan → unique dokumen bentrok; pakai yang sudah dibuat.
      if ((e as { code?: string })?.code !== "P2002") throw e;
      review = await db.review.findFirstOrThrow({ where, select: { id: true, token: true, rating: true } });
    }
  }
  await db.review.update({ where: { id: review.id }, data: { requestedAt: new Date(), customerPhone: doc.phone } });
  return {
    token: review.token,
    alreadySubmitted: review.rating != null,
    docNumber: doc.docNumber,
    customerName: doc.customerName,
    phone: doc.phone,
  };
}

/** Ulasan (bila ada) untuk sebuah dokumen — status tombol di halaman detail. */
export function getReviewForDoc(tenantId: string, ref: ReviewDocRef) {
  return db.review
    .findFirst({ where: { tenantId, ...docWhere(ref) }, select: { rating: true, requestedAt: true, submittedAt: true } })
    .catch(() => null); // tabel belum dimigrasi → anggap belum ada
}

// ── Publik (token) ─────────────────────────────────────────────────────────

/** Data halaman publik /ulasan/<token> (di-cache per request: metadata + halaman). */
export const getReviewByToken = cache(async (token: string) => {
  if (!isReviewToken(token)) return null;
  const r = await db.review.findUnique({
    where: { token },
    select: {
      id: true,
      source: true,
      docNumber: true,
      customerName: true,
      rating: true,
      comment: true,
      allowPublic: true,
      submittedAt: true,
      tenant: { select: { name: true, logo: true, slug: true, isActive: true, updatedAt: true, googleReviewUrl: true, phone: true } },
    },
  });
  if (!r || !r.tenant.isActive) return null;
  return r;
});

export async function submitReview(
  token: string,
  input: { rating: number; comment?: string | null; allowPublic?: boolean },
) {
  const err = validateReviewInput(input);
  if (err) throw new Error(err);
  const r = await getReviewByToken(token);
  if (!r) throw new Error("Link ulasan tidak berlaku.");
  const comment = cleanComment(input.comment);
  const changed = r.rating !== input.rating || (r.comment ?? null) !== comment || r.allowPublic !== !!input.allowPublic;
  await db.review.update({
    where: { id: r.id },
    data: {
      rating: input.rating,
      comment,
      allowPublic: !!input.allowPublic && !!comment,
      submittedAt: new Date(),
      // Isi berubah → testimoni ditinjau ulang; ulasan naik ke ≥4 tak perlu tindak lanjut lagi.
      ...(changed ? { testimonial: "PENDING" as const } : {}),
    },
  });
  const googleUrl = isGoogleReviewUrl(r.tenant.googleReviewUrl) ? r.tenant.googleReviewUrl : null;
  return { outcome: reviewOutcome(input.rating, !!googleUrl), googleUrl };
}

export async function recordGoogleClick(token: string) {
  if (!isReviewToken(token)) return;
  await db.review.updateMany({ where: { token, rating: { gte: GOOGLE_MIN_RATING } }, data: { googleClickedAt: new Date() } });
}

// ── Admin ──────────────────────────────────────────────────────────────────

export function listReviews(tenantId: string) {
  return db.review.findMany({
    where: { tenantId },
    orderBy: [{ submittedAt: { sort: "desc", nulls: "last" } }, { requestedAt: "desc" }],
    take: 300,
  });
}

/**
 * Dokumen 30 hari terakhir yang siap dimintai ulasan & BELUM pernah diminta:
 * servis Selesai/Diambil, rakitan Selesai/Diserahkan, penjualan member.
 */
export async function listReviewCandidates(tenantId: string, days = 30) {
  const since = new Date(Date.now() - days * 86_400_000);
  const [tickets, builds, sales, existing] = await Promise.all([
    db.serviceTicket.findMany({
      where: { tenantId, status: { in: [...DONE_SERVICE] }, updatedAt: { gte: since } },
      select: { id: true, number: true, customerName: true, customerPhone: true, deviceType: true, deviceBrand: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),
    db.pcBuild.findMany({
      where: { tenantId, status: { in: [...DONE_BUILD] }, updatedAt: { gte: since } },
      select: { id: true, number: true, name: true, customerName: true, customerId: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 40,
    }),
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED", customerId: { not: null }, createdAt: { gte: since } },
      select: { id: true, number: true, customerName: true, customerId: true, total: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 60,
    }),
    db.review.findMany({
      where: { tenantId, createdAt: { gte: new Date(since.getTime() - 86_400_000) } },
      select: { serviceTicketId: true, pcBuildId: true, saleId: true },
    }),
  ]);
  const done = new Set(existing.flatMap((r) => [r.serviceTicketId, r.pcBuildId, r.saleId]).filter(Boolean));
  const custIds = [...new Set([...builds, ...sales].map((x) => x.customerId).filter((v): v is string => !!v))];
  const phones = custIds.length
    ? new Map(
        (await db.customer.findMany({ where: { tenantId, id: { in: custIds } }, select: { id: true, phone: true } })).map(
          (c) => [c.id, c.phone],
        ),
      )
    : new Map<string, string | null>();
  type Cand = { source: ReviewSource; id: string; number: string; title: string; customerName: string | null; phone: string | null; at: Date };
  const out: Cand[] = [
    ...tickets
      .filter((t) => !done.has(t.id))
      .map((t) => ({
        source: "SERVICE" as const,
        id: t.id,
        number: t.number,
        title: [t.deviceType, t.deviceBrand].filter(Boolean).join(" "),
        customerName: t.customerName,
        phone: t.customerPhone,
        at: t.updatedAt,
      })),
    ...builds
      .filter((b) => !done.has(b.id))
      .map((b) => ({
        source: "BUILD" as const,
        id: b.id,
        number: b.number,
        title: b.name,
        customerName: b.customerName,
        phone: b.customerId ? (phones.get(b.customerId) ?? null) : null,
        at: b.updatedAt,
      })),
    ...sales
      .filter((s) => !done.has(s.id))
      .map((s) => ({
        source: "SALE" as const,
        id: s.id,
        number: s.number,
        title: "Belanja di toko",
        customerName: s.customerName,
        phone: s.customerId ? (phones.get(s.customerId) ?? null) : null,
        at: s.createdAt,
      })),
  ];
  return out.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, 80);
}

export async function setTestimonialStatus(tenantId: string, id: string, status: TestimonialStatus) {
  const r = await db.review.updateMany({ where: { id, tenantId, allowPublic: true }, data: { testimonial: status } });
  if (r.count === 0) throw new Error("Ulasan tidak ditemukan atau pelanggan tidak mengizinkan ditampilkan.");
}

export async function setFollowUp(tenantId: string, id: string, done: boolean, note?: string | null) {
  const r = await db.review.updateMany({
    where: { id, tenantId },
    data: { followUpDoneAt: done ? new Date() : null, followUpNote: (note ?? "").trim().slice(0, 300) || null },
  });
  if (r.count === 0) throw new Error("Ulasan tidak ditemukan.");
}

export async function getReviewSettings(tenantId: string) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { googleReviewUrl: true, slug: true } });
  return { googleReviewUrl: t?.googleReviewUrl ?? null, slug: t?.slug ?? null };
}

export async function updateGoogleReviewUrl(tenantId: string, url: string | null) {
  const v = (url ?? "").trim();
  if (v && !isGoogleReviewUrl(v)) {
    throw new Error("Link harus dari Google (https://g.page/…, https://maps.app.goo.gl/…, atau google.com/maps…).");
  }
  await db.tenant.update({ where: { id: tenantId }, data: { googleReviewUrl: v || null } });
}

/** Ringkasan untuk insight/Dashboard: ulasan rendah belum ditindaklanjuti. */
export function countOpenFollowUps(tenantId: string) {
  return db.review
    .count({ where: { tenantId, rating: { lt: GOOGLE_MIN_RATING }, submittedAt: { not: null }, followUpDoneAt: null } })
    .catch(() => 0);
}

// ── Galeri Publik ──────────────────────────────────────────────────────────

export interface PublicTestimonial {
  id: string;
  name: string;
  rating: number;
  comment: string;
  source: ReviewSource;
  at: string; // ISO
}

/**
 * Testimoni publik (pelanggan mengizinkan + toko menyetujui) + rata-rata bintang
 * SEMUA ulasan (jujur, bukan hanya yang dipilih). Aman bila tabel belum ada.
 */
export async function getPublicReviews(tenantId: string, limit = 12) {
  try {
    const [rows, all] = await Promise.all([
      db.review.findMany({
        where: { tenantId, allowPublic: true, testimonial: "APPROVED", rating: { not: null }, comment: { not: null } },
        orderBy: { submittedAt: "desc" },
        take: limit,
        select: { id: true, customerName: true, rating: true, comment: true, source: true, submittedAt: true },
      }),
      db.review.findMany({
        where: { tenantId, rating: { not: null }, submittedAt: { not: null } },
        select: {
          rating: true,
          submittedAt: true,
          requestedAt: true,
          googleClickedAt: true,
          followUpDoneAt: true,
          allowPublic: true,
          testimonial: true,
        },
      }),
    ]);
    const s = summarizeReviews(all);
    return {
      average: s.average,
      count: s.submitted,
      testimonials: rows.map(
        (r): PublicTestimonial => ({
          id: r.id,
          name: shortName(r.customerName),
          rating: r.rating ?? 5,
          comment: r.comment ?? "",
          source: r.source,
          at: (r.submittedAt ?? new Date()).toISOString(),
        }),
      ),
    };
  } catch {
    return { average: null, count: 0, testimonials: [] as PublicTestimonial[] };
  }
}
