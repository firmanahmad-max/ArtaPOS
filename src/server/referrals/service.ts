import "server-only";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";
import { disambiguatedName, phoneKey } from "@/lib/phone";
import { programStarted } from "@/lib/loyalty";
import {
  DEFAULT_REFERRAL,
  isReferralCode,
  makeReferralCode,
  normalizeReferralCode,
  qualifies,
  REFERRER_MONTHLY_CAP,
  SIGNUPS_PER_CODE_PER_DAY,
  validateReferralConfig,
  type ReferralConfig,
} from "@/lib/referral";

/**
 * Service Program Ajak Teman — ter-scope tenantId (admin) atau slug toko + kode (publik).
 * Bonus diberikan SEKALI per teman (Referral.friendId unik) lewat klaim atomik
 * `updateMany where status PENDING`, di luar transaksi kasir (best-effort) agar
 * kegagalan program bonus tak pernah menggagalkan penjualan/servis.
 */

type Db = typeof db | Prisma.TransactionClient;
const DAY = 86_400_000;

export async function getReferralConfig(
  tenantId: string,
): Promise<ReferralConfig & { loyaltyStarted: boolean; slug: string | null }> {
  const t = await db.tenant
    .findUnique({
      where: { id: tenantId },
      select: {
        referralEnabled: true,
        referralReferrerPoints: true,
        referralFriendPoints: true,
        referralMinPurchase: true,
        referralValidDays: true,
        pointsStartAt: true,
        slug: true,
      },
    })
    .catch(() => null); // kolom belum dimigrasi
  if (!t) return { ...DEFAULT_REFERRAL, loyaltyStarted: false, slug: null };
  return {
    enabled: t.referralEnabled,
    referrerPoints: t.referralReferrerPoints,
    friendPoints: t.referralFriendPoints,
    minPurchase: t.referralMinPurchase,
    validDays: t.referralValidDays,
    loyaltyStarted: programStarted(t.pointsStartAt, Date.now()),
    slug: t.slug,
  };
}

export async function updateReferralConfig(tenantId: string, cfg: ReferralConfig) {
  const err = validateReferralConfig(cfg);
  if (err) throw new Error(err);
  await db.tenant.update({
    where: { id: tenantId },
    data: {
      referralEnabled: cfg.enabled,
      referralReferrerPoints: cfg.referrerPoints,
      referralFriendPoints: cfg.friendPoints,
      referralMinPurchase: cfg.minPurchase,
      referralValidDays: cfg.validDays,
    },
  });
}

/** Kode ajak pelanggan (dibuat malas; aman balapan & bentrok kode). */
export async function ensureReferralCode(tenantId: string, customerId: string): Promise<string | null> {
  const c = await db.customer.findFirst({
    where: { id: customerId, tenantId, isActive: true },
    select: { id: true, name: true, referralCode: true },
  });
  if (!c) return null;
  if (c.referralCode) return c.referralCode;
  for (let i = 0; i < 6; i++) {
    const code = makeReferralCode(c.name);
    try {
      const r = await db.customer.updateMany({ where: { id: c.id, referralCode: null }, data: { referralCode: code } });
      if (r.count === 0) break; // sudah diisi proses lain
      return code;
    } catch (e) {
      if ((e as { code?: string })?.code !== "P2002") throw e; // bentrok kode → coba lagi
    }
  }
  const again = await db.customer.findUnique({ where: { id: c.id }, select: { referralCode: true } });
  return again?.referralCode ?? null;
}

/** Pernah jadi pelanggan? (member terdaftar ATAU tiket servis dgn No. HP sama). */
async function isExistingCustomer(client: Db, tenantId: string, key: string) {
  const member = await client.customer.findFirst({ where: { tenantId, phoneKey: key }, select: { id: true } });
  if (member) return true;
  const tail = key.slice(-7);
  const tickets = await client.serviceTicket.findMany({
    where: { tenantId, customerPhone: { contains: tail } },
    select: { customerPhone: true },
    take: 20,
  });
  return tickets.some((t) => phoneKey(t.customerPhone) === key);
}

// ── Publik: halaman /ajak/<slug>/<kode> ──────────────────────────────────

export async function getReferralLanding(slug: string, rawCode: string) {
  const code = normalizeReferralCode(rawCode);
  if (!isReferralCode(code)) return null;
  const tenant = await db.tenant
    .findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
        phone: true,
        address: true,
        isActive: true,
        updatedAt: true,
        pointValue: true,
        referralEnabled: true,
        referralFriendPoints: true,
        referralMinPurchase: true,
        referralValidDays: true,
      },
    })
    .catch(() => null);
  if (!tenant || !tenant.isActive || !tenant.referralEnabled) return null;
  const referrer = await db.customer.findFirst({
    where: { tenantId: tenant.id, referralCode: code, isActive: true },
    select: { id: true, name: true },
  });
  if (!referrer) return null;
  return { tenant, referrer, code };
}

export async function registerReferredFriend(
  slug: string,
  rawCode: string,
  input: { name: string; phone: string; consent: boolean },
) {
  const landing = await getReferralLanding(slug, rawCode);
  if (!landing) throw new Error("Link ajakan tidak berlaku.");
  const name = input.name.replace(/\s+/g, " ").trim().slice(0, 80);
  const key = phoneKey(input.phone);
  if (name.length < 2) throw new Error("Isi nama Anda.");
  if (!key) throw new Error("No. WhatsApp tidak valid.");
  const { tenant, referrer } = landing;

  return db.$transaction(async (tx) => {
    if (await isExistingCustomer(tx, tenant.id, key)) {
      throw new Error(
        "No. WhatsApp ini sudah tercatat sebagai pelanggan kami — program ajak teman khusus pelanggan baru. Terima kasih sudah kembali! 🙏",
      );
    }
    const today = await tx.referral.count({
      where: { tenantId: tenant.id, referrerId: referrer.id, createdAt: { gte: new Date(Date.now() - DAY) } },
    });
    if (today >= SIGNUPS_PER_CODE_PER_DAY) {
      throw new Error("Pendaftaran lewat link ini sedang dibatasi. Silakan coba lagi besok atau hubungi toko.");
    }
    const dup = await tx.customer.findFirst({
      where: { tenantId: tenant.id, isActive: true, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    const friend = await tx.customer.create({
      data: {
        tenantId: tenant.id,
        name: dup ? disambiguatedName(name, input.phone) : name,
        phone: input.phone.trim(),
        phoneKey: key,
        waConsent: !!input.consent,
      },
      select: { id: true },
    });
    await tx.referral.create({
      data: {
        tenantId: tenant.id,
        referrerId: referrer.id,
        friendId: friend.id,
        expiresAt: new Date(Date.now() + tenant.referralValidDays * DAY),
      },
    });
    return { validDays: tenant.referralValidDays };
  });
}

// ── Admin: tautkan kode saat teman datang langsung ke toko ─────────────────

/**
 * Tautkan pelanggan BARU ke pengajak lewat kode (mis. teman datang langsung ke toko
 * dan menyebut kode). Ditolak bila pelanggan sudah pernah mendapat poin transaksi.
 */
export async function linkReferralByCode(tenantId: string, friendId: string, rawCode: string) {
  const cfg = await getReferralConfig(tenantId);
  if (!cfg.enabled) throw new Error("Program Ajak Teman belum diaktifkan.");
  const code = normalizeReferralCode(rawCode);
  if (!isReferralCode(code)) throw new Error("Kode ajak tidak valid.");
  const [referrer, friend] = await Promise.all([
    db.customer.findFirst({ where: { tenantId, referralCode: code, isActive: true }, select: { id: true, name: true } }),
    db.customer.findFirst({ where: { id: friendId, tenantId }, select: { id: true } }),
  ]);
  if (!friend) throw new Error("Pelanggan tidak ditemukan.");
  if (!referrer) throw new Error("Kode ajak tidak ditemukan.");
  if (referrer.id === friend.id) throw new Error("Tidak bisa mengajak diri sendiri.");
  const earned = await db.pointEntry.count({ where: { tenantId, customerId: friend.id, type: "EARN" } });
  if (earned > 0) throw new Error("Pelanggan ini sudah pernah bertransaksi — bonus hanya untuk pelanggan baru.");
  try {
    await db.referral.create({
      data: { tenantId, referrerId: referrer.id, friendId: friend.id, expiresAt: new Date(Date.now() + cfg.validDays * DAY) },
    });
  } catch (e) {
    if ((e as { code?: string })?.code === "P2002") throw new Error("Pelanggan ini sudah tercatat diajak oleh member lain.");
    throw e;
  }
  return { referrerName: referrer.name };
}

// ── Bonus otomatis ─────────────────────────────────────────────────────────

/**
 * Dipanggil SETELAH transaksi pelanggan menjadi LUNAS (kasir/servis/rakitan).
 * Bila pelanggan ini teman yang diajak, masih berlaku, & total memenuhi minimal →
 * bonus poin ke teman & pengajak (pengajak dibatasi REFERRER_MONTHLY_CAP / 30 hari).
 * Best-effort: kesalahan diserap pemanggil (`.catch`). Idempoten via klaim PENDING.
 */
export async function completeReferralIfEligible(
  tenantId: string,
  customerId: string | null | undefined,
  doc: { total: number; number: string },
) {
  if (!customerId) return null;
  const ref = await db.referral
    .findFirst({ where: { tenantId, friendId: customerId, status: "PENDING" } })
    .catch(() => null); // tabel belum ada
  if (!ref || ref.expiresAt.getTime() < Date.now()) return null;
  const cfg = await getReferralConfig(tenantId);
  if (!cfg.enabled || !cfg.loyaltyStarted || !qualifies(doc.total, cfg)) return null;

  return db.$transaction(async (tx) => {
    const since = new Date(Date.now() - 30 * DAY);
    const recent = await tx.referral.count({
      where: { tenantId, referrerId: ref.referrerId, status: "REWARDED", rewardedAt: { gte: since } },
    });
    const referrer = await tx.customer.findFirst({
      where: { id: ref.referrerId, tenantId, isActive: true },
      select: { id: true, name: true },
    });
    const referrerPts = referrer && recent < REFERRER_MONTHLY_CAP ? cfg.referrerPoints : 0;
    const friendPts = cfg.friendPoints;
    // Klaim atomik: hanya satu pemanggil yang menang (cegah bonus ganda).
    const claimed = await tx.referral.updateMany({
      where: { id: ref.id, status: "PENDING" },
      data: {
        status: "REWARDED",
        rewardedAt: new Date(),
        referrerPoints: referrerPts,
        friendPoints: friendPts,
        qualifyingDoc: doc.number,
        qualifyingTotal: doc.total,
      },
    });
    if (claimed.count === 0) return null;
    const friend = await tx.customer.findUnique({ where: { id: customerId }, select: { name: true } });
    if (friendPts > 0) {
      await tx.customer.update({ where: { id: customerId }, data: { points: { increment: friendPts } } });
      await tx.pointEntry.create({
        data: {
          tenantId,
          customerId,
          points: friendPts,
          type: "ADJUST",
          note: `Bonus ajak teman — transaksi pertama ${doc.number}`,
        },
      });
    }
    if (referrer && referrerPts > 0) {
      await tx.customer.update({ where: { id: referrer.id }, data: { points: { increment: referrerPts } } });
      await tx.pointEntry.create({
        data: {
          tenantId,
          customerId: referrer.id,
          points: referrerPts,
          type: "ADJUST",
          note: `Bonus ajak teman — ${friend?.name ?? "teman"} bertransaksi (${doc.number})`,
        },
      });
    }
    return { referrerName: referrer?.name ?? null, friendName: friend?.name ?? null, referrerPts, friendPts };
  });
}

/**
 * Panggilan aman dari alur transaksi (tak pernah melempar): muat dokumen, dan bila
 * sudah LUNAS & milik pelanggan terdaftar → coba berikan bonus ajak teman.
 */
export async function rewardReferralForDoc(
  tenantId: string,
  ref: { saleId: string } | { serviceTicketId: string } | { pcBuildId: string },
) {
  try {
    let doc: { customerId: string | null; total: number; paid: number; number: string } | null = null;
    if ("saleId" in ref) {
      const s = await db.sale.findFirst({
        where: { id: ref.saleId, tenantId, status: "COMPLETED" },
        select: { customerId: true, total: true, paid: true, number: true, paymentStatus: true },
      });
      doc = s && s.paymentStatus === "PAID" ? { ...s, paid: Math.max(s.paid, s.total) } : null;
    } else if ("serviceTicketId" in ref) {
      doc = await db.serviceTicket.findFirst({
        where: { id: ref.serviceTicketId, tenantId, status: { not: "CANCELLED" } },
        select: { customerId: true, total: true, paid: true, number: true },
      });
    } else {
      doc = await db.pcBuild.findFirst({
        where: { id: ref.pcBuildId, tenantId, status: { not: "CANCELLED" } },
        select: { customerId: true, total: true, paid: true, number: true },
      });
    }
    if (!doc?.customerId || doc.total <= 0 || doc.paid < doc.total) return null;
    return await completeReferralIfEligible(tenantId, doc.customerId, { total: doc.total, number: doc.number });
  } catch {
    return null; // bonus best-effort — jangan ganggu transaksi
  }
}

// ── Admin: daftar & ringkasan ──────────────────────────────────────────────

export async function listReferrals(tenantId: string) {
  const rows = await db.referral.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: 300 });
  const ids = [...new Set(rows.flatMap((r) => [r.referrerId, r.friendId]))];
  const people = ids.length
    ? await db.customer.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true, phone: true } })
    : [];
  const map = new Map(people.map((p) => [p.id, p]));
  return rows.map((r) => ({ ...r, referrer: map.get(r.referrerId) ?? null, friend: map.get(r.friendId) ?? null }));
}

export async function cancelReferral(tenantId: string, id: string) {
  const r = await db.referral.updateMany({ where: { id, tenantId, status: "PENDING" }, data: { status: "CANCELLED" } });
  if (r.count === 0) throw new Error("Ajakan tidak ditemukan atau sudah selesai.");
}

/** Info ajak teman untuk satu pelanggan (halaman edit pelanggan & Portal Member). */
export async function getCustomerReferral(tenantId: string, customerId: string) {
  const [code, referredBy, friends] = await Promise.all([
    ensureReferralCode(tenantId, customerId),
    db.referral.findUnique({ where: { friendId: customerId } }).catch(() => null),
    db.referral
      .findMany({
        where: { tenantId, referrerId: customerId, status: { not: "CANCELLED" } },
        select: { status: true, expiresAt: true, referrerPoints: true, friendId: true, createdAt: true, rewardedAt: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      })
      .catch(() => []),
  ]);
  const referrer =
    referredBy && referredBy.tenantId === tenantId
      ? await db.customer.findFirst({ where: { id: referredBy.referrerId, tenantId }, select: { name: true } })
      : null;
  const now = Date.now();
  return {
    code,
    referredBy: referredBy && referredBy.tenantId === tenantId ? { name: referrer?.name ?? null, status: referredBy.status } : null,
    friends: {
      total: friends.length,
      rewarded: friends.filter((f) => f.status === "REWARDED").length,
      pending: friends.filter((f) => f.status === "PENDING" && f.expiresAt.getTime() >= now).length,
      points: friends.reduce((s, f) => s + (f.status === "REWARDED" ? f.referrerPoints : 0), 0),
    },
  };
}
