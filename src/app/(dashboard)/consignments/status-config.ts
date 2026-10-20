import type { ConsignmentStatus } from "@/lib/consignment-calc";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const CONSIGNMENT_STATUS_META: Record<ConsignmentStatus, { label: string; variant: Variant }> = {
  AVAILABLE: { label: "Dititipkan", variant: "default" },
  SOLD: { label: "Terjual", variant: "success" },
  RETURNED: { label: "Diambil kembali", variant: "muted" },
};

/** Saran jenis komponen (tetap bisa diketik bebas). */
export const CONSIGNMENT_CATEGORIES = [
  "1 Set PC",
  "Paket Bundel",
  "Prosesor",
  "VGA",
  "RAM",
  "SSD",
  "HDD",
  "Motherboard",
  "PSU",
  "Casing",
  "Monitor",
  "Laptop",
  "Keyboard/Mouse",
  "Lainnya",
];
