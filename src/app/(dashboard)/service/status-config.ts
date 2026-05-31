import type { ServiceStatus } from "@/generated/prisma/enums";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const SERVICE_STATUS_META: Record<ServiceStatus, { label: string; variant: Variant }> = {
  RECEIVED: { label: "Diterima", variant: "secondary" },
  IN_PROGRESS: { label: "Dikerjakan", variant: "default" },
  WAITING_PARTS: { label: "Tunggu Sparepart", variant: "warning" },
  DONE: { label: "Selesai", variant: "success" },
  DELIVERED: { label: "Diserahkan", variant: "muted" },
  CANCELLED: { label: "Batal", variant: "destructive" },
};

/** Urutan langkah status untuk tombol workflow. */
export const SERVICE_FLOW: ServiceStatus[] = [
  "RECEIVED",
  "IN_PROGRESS",
  "WAITING_PARTS",
  "DONE",
  "DELIVERED",
];
