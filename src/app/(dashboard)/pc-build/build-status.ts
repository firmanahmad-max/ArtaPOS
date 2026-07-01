import type { BuildStatus } from "@/generated/prisma/enums";

type Variant = "default" | "secondary" | "success" | "warning" | "destructive" | "muted";

export const BUILD_STATUS_META: Record<
  BuildStatus,
  { label: string; variant: Variant; emoji: string }
> = {
  DRAFT: { label: "Draft", variant: "secondary", emoji: "📝" },
  ASSEMBLING: { label: "Dirakit", variant: "default", emoji: "🔧" },
  DONE: { label: "Selesai", variant: "success", emoji: "✅" },
  DELIVERED: { label: "Diserahkan", variant: "muted", emoji: "🎉" },
  CANCELLED: { label: "Batal", variant: "destructive", emoji: "🚫" },
};

export const BUILD_FLOW: BuildStatus[] = ["DRAFT", "ASSEMBLING", "DONE", "DELIVERED"];
