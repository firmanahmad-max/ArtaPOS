import type { UsedGrade, UsedStatus } from "@/lib/used-item";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const USED_STATUS_META: Record<UsedStatus, { label: string; variant: Variant }> = {
  AVAILABLE: { label: "Tersedia", variant: "default" },
  SOLD: { label: "Terjual", variant: "success" },
  WITHDRAWN: { label: "Ditarik", variant: "muted" },
};

export const USED_GRADE_VARIANT: Record<UsedGrade, Variant> = {
  LIKE_NEW: "success",
  GOOD: "default",
  FAIR: "secondary",
  POOR: "warning",
};

/** Saran jenis barang (tetap bisa diketik bebas). */
export const USED_CATEGORIES = [
  "Laptop",
  "PC Rakitan",
  "Prosesor",
  "VGA",
  "RAM",
  "SSD",
  "HDD",
  "Motherboard",
  "PSU",
  "Casing",
  "Monitor",
  "Printer",
  "Keyboard/Mouse",
  "Lainnya",
];

/** Barang tersedia lebih lama dari ini dianggap "lama belum laku" (perlu promo/turun harga). */
export const AGING_DAYS = 60;
