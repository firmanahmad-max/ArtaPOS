"use server";

import { db } from "@/lib/db";
import { normalizePhoneId } from "@/lib/whatsapp";
import { checkRateLimit } from "@/lib/auth/rate-limit";
import { getClientIp } from "@/lib/request-ip";
import { rmaPublicStatusLabel } from "@/app/(dashboard)/rma/status-config";

/**
 * Lacak status servis untuk pelanggan — PUBLIK (tanpa login).
 * Verifikasi dengan no. tiket + no. HP agar tak bisa di-enumerasi sembarangan.
 * Hanya mengembalikan info aman (tanpa biaya/data internal).
 */

const STATUS_LABEL: Record<string, string> = {
  RECEIVED: "Diterima",
  IN_PROGRESS: "Sedang Dikerjakan",
  WAITING_PARTS: "Menunggu Sparepart",
  DONE: "Selesai (siap diambil)",
  DELIVERED: "Sudah Diserahkan",
  CANCELLED: "Dibatalkan",
};

export interface TrackResult {
  found: boolean;
  rateLimited?: boolean;
  number?: string;
  device?: string;
  statusLabel?: string;
  createdAt?: string;
  completedAt?: string | null;
  technician?: string | null;
  /** Biaya tiket: estimasi saat dikerjakan, total saat selesai. */
  cost?: number;
  costFinal?: boolean;
}

export async function trackServiceAction(number: string, phone: string): Promise<TrackResult> {
  // Rate-limit per IP (endpoint publik tanpa login) — cegah enumerasi/abuse.
  const ip = await getClientIp();
  if (!(await checkRateLimit(`track:ip:${ip}`, { maxAttempts: 20 }))) {
    return { found: false, rateLimited: true };
  }

  const num = number.trim().toUpperCase();
  const phoneNorm = normalizePhoneId(phone.trim());
  if (!num || !phoneNorm) return { found: false };

  // Endpoint publik tanpa sesi/tenant: nomor tiket berurutan per-tenant sehingga
  // bisa bertabrakan antar toko. Ambil semua yang cocok nomornya, lalu pilih
  // yang nomor HP-nya cocok (identitas = nomor tiket + HP).
  const tickets = await db.serviceTicket.findMany({
    where: { number: num },
    select: {
      number: true,
      deviceType: true,
      deviceBrand: true,
      status: true,
      total: true,
      customerPhone: true,
      createdAt: true,
      completedAt: true,
      technicianName: true,
    },
  });

  const ticket = tickets.find(
    (t) => t.customerPhone && normalizePhoneId(t.customerPhone) === phoneNorm,
  );
  if (!ticket) return { found: false };

  // Biaya: estimasi selama dikerjakan, total final saat selesai/diserahkan.
  const costFinal = ticket.status === "DONE" || ticket.status === "DELIVERED";
  const showCost = ticket.status !== "CANCELLED" && ticket.total > 0;

  return {
    found: true,
    number: ticket.number,
    device: [ticket.deviceType, ticket.deviceBrand].filter(Boolean).join(" "),
    statusLabel: STATUS_LABEL[ticket.status] ?? ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    completedAt: ticket.completedAt ? ticket.completedAt.toISOString() : null,
    technician: ticket.technicianName,
    cost: showCost ? ticket.total : undefined,
    costFinal,
  };
}

export interface TrackRmaResult {
  found: boolean;
  rateLimited?: boolean;
  number?: string;
  product?: string;
  serialNumber?: string | null;
  statusLabel?: string;
  done?: boolean; // true bila sudah kembali/ditolak (final)
  sentAt?: string;
  receivedAt?: string | null;
}

/**
 * Lacak status klaim RMA (garansi) untuk pelanggan — PUBLIK (tanpa login).
 * Verifikasi dengan no. klaim (RMA-xxxxx) + no. HP. Hanya info aman
 * (tanpa distributor/resi/catatan internal).
 */
export async function trackRmaAction(number: string, phone: string): Promise<TrackRmaResult> {
  const ip = await getClientIp();
  if (!(await checkRateLimit(`track:ip:${ip}`, { maxAttempts: 20 }))) {
    return { found: false, rateLimited: true };
  }

  const num = number.trim().toUpperCase();
  const phoneNorm = normalizePhoneId(phone.trim());
  if (!num || !phoneNorm) return { found: false };

  const claims = await db.rmaClaim.findMany({
    where: { number: num },
    select: {
      number: true,
      productName: true,
      serialNumber: true,
      status: true,
      resolution: true,
      customerPhone: true,
      sentAt: true,
      receivedAt: true,
    },
  });

  const claim = claims.find(
    (c) => c.customerPhone && normalizePhoneId(c.customerPhone) === phoneNorm,
  );
  if (!claim) return { found: false };

  return {
    found: true,
    number: claim.number,
    product: claim.productName,
    serialNumber: claim.serialNumber,
    statusLabel: rmaPublicStatusLabel(claim.status, claim.resolution),
    done: claim.status !== "SENT",
    sentAt: claim.sentAt.toISOString(),
    receivedAt: claim.receivedAt ? claim.receivedAt.toISOString() : null,
  };
}
