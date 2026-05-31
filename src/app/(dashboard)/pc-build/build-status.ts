import type { BuildStatus } from "@/generated/prisma/enums";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const BUILD_STATUS_META: Record<BuildStatus, { label: string; variant: Variant }> = {
  DRAFT: { label: "Draft", variant: "secondary" },
  ASSEMBLING: { label: "Dirakit", variant: "default" },
  DONE: { label: "Selesai", variant: "success" },
  DELIVERED: { label: "Diserahkan", variant: "muted" },
  CANCELLED: { label: "Batal", variant: "destructive" },
};

export const BUILD_FLOW: BuildStatus[] = ["DRAFT", "ASSEMBLING", "DONE", "DELIVERED"];
