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
