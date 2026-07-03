import type { RmaStatus, RmaResolution } from "@/generated/prisma/enums";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const RMA_STATUS_META: Record<RmaStatus, { label: string; variant: Variant }> = {
  SENT: { label: "Di Distributor", variant: "warning" },
  RETURNED: { label: "Sudah Kembali", variant: "success" },
  REJECTED: { label: "Ditolak", variant: "destructive" },
};

export const RMA_RESOLUTION_LABEL: Record<RmaResolution, string> = {
  REPAIRED: "Diservis / diperbaiki",
  REPLACED: "Ganti unit baru",
  REFUNDED: "Refund / nota kredit",
};

/** Status ramah-pelanggan untuk halaman lacak publik & pesan WhatsApp. */
export function rmaPublicStatusLabel(
  status: RmaStatus,
  resolution: RmaResolution | null,
): string {
  if (status === "SENT") return "Sedang diproses distributor (klaim garansi)";
  if (status === "REJECTED") return "Klaim garansi ditolak distributor";
  // RETURNED
  if (resolution === "REPLACED") return "Selesai — unit diganti baru";
  if (resolution === "REFUNDED") return "Selesai — dana dikembalikan";
  if (resolution === "REPAIRED") return "Selesai — unit sudah diperbaiki";
  return "Selesai — barang sudah kembali";
}
