import type { ServiceStatus } from "@/generated/prisma/enums";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const SERVICE_STATUS_META: Record<
  ServiceStatus,
  { label: string; variant: Variant; emoji: string }
> = {
  RECEIVED: { label: "Diterima", variant: "secondary", emoji: "⏳" },
  IN_PROGRESS: { label: "Dikerjakan", variant: "default", emoji: "🔧" },
  WAITING_PARTS: { label: "Tunggu Sparepart", variant: "warning", emoji: "📦" },
  DONE: { label: "Selesai", variant: "success", emoji: "✅" },
  DELIVERED: { label: "Diserahkan", variant: "muted", emoji: "🎉" },
  CANCELLED: { label: "Batal", variant: "destructive", emoji: "🚫" },
};

/**
 * Saran keterangan status (pilihan cepat) per fase. Tetap bisa diketik bebas —
 * ini hanya mempercepat isian yang sering dipakai teknisi.
 */
export const STATUS_NOTE_SUGGESTIONS: Record<ServiceStatus, string[]> = {
  RECEIVED: ["Antre pengecekan", "Menunggu konfirmasi biaya dari pelanggan", "Unit sedang dicek awal"],
  IN_PROGRESS: ["Sedang diagnosa kerusakan", "Proses instal ulang & driver", "Backup data pelanggan", "Uji ketahanan (stress test)", "Pembersihan & ganti pasta termal"],
  WAITING_PARTS: ["Sparepart sedang dipesan", "Sparepart dalam pengiriman", "Dikirim ke service center resmi", "Menunggu stok dari distributor"],
  DONE: ["Sudah dites normal, siap diambil", "Siap diambil — mohon bawa nota", "Tidak bisa diperbaiki, unit siap diambil"],
  DELIVERED: ["Diambil oleh pelanggan", "Dikirim via kurir"],
  CANCELLED: ["Dibatalkan pelanggan", "Biaya tidak disetujui"],
};

/** Urutan langkah status untuk tombol workflow. */
export const SERVICE_FLOW: ServiceStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
];
