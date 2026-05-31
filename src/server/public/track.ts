"use server";

import { db } from "@/lib/db";
import { normalizePhoneId } from "@/lib/whatsapp";

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
  number?: string;
  device?: string;
  statusLabel?: string;
  createdAt?: string;
  completedAt?: string | null;
  technician?: string | null;
}

export async function trackServiceAction(number: string, phone: string): Promise<TrackResult> {
  const num = number.trim().toUpperCase();
  const phoneNorm = normalizePhoneId(phone.trim());
  if (!num || !phoneNorm) return { found: false };

  const ticket = await db.serviceTicket.findFirst({
    where: { number: num },
    select: {
      number: true,
      deviceType: true,
      deviceBrand: true,
      status: true,
      customerPhone: true,
      createdAt: true,
      completedAt: true,
      technicianName: true,
    },
  });

  if (!ticket || !ticket.customerPhone) return { found: false };
  if (normalizePhoneId(ticket.customerPhone) !== phoneNorm) return { found: false };

  return {
    found: true,
    number: ticket.number,
    device: [ticket.deviceType, ticket.deviceBrand].filter(Boolean).join(" "),
    statusLabel: STATUS_LABEL[ticket.status] ?? ticket.status,
    createdAt: ticket.createdAt.toISOString(),
    completedAt: ticket.completedAt ? ticket.completedAt.toISOString() : null,
    technician: ticket.technicianName,
  };
}
