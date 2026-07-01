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

/** Urutan langkah status untuk tombol workflow. */
export const SERVICE_FLOW: ServiceStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
];
