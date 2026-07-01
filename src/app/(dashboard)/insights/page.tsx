import type { Metadata } from "next";
import { Sparkles } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getArtaInsights } from "@/server/insights/service";
import { Card } from "@/components/ui/card";
import { ArtaInsights } from "./arta-insights";

export const metadata: Metadata = { title: "Tanya Arta" };

export default async function InsightsPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin melihat insight.</Card>;
  }

  const insights = await getArtaInsights(user.tenantId, user.role);
  const attention = insights.filter((i) => i.tone === "critical" || i.tone === "warning").length;
  const goodNews = insights.filter((i) => i.tone === "positive").length;

  const summary =
    insights.length === 0
      ? "Arta belum menemukan hal yang perlu ditindaklanjuti."
      : `Arta menemukan ${attention} hal yang perlu perhatian` +
        (goodNews > 0 ? ` dan ${goodNews} kabar baik` : "") +
        ".";

  return (
    <div className="space-y-6">
      {/* Header Arta */}
      <div className="relative overflow-hidden rounded-2xl gradient-brand p-6 text-primary-foreground elevate-lg">
        <span aria-hidden className="pointer-events-none absolute -right-6 -top-8 size-32 rounded-full bg-white/10" />
        <div className="relative flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-white/20">
            <Sparkles className="size-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Tanya Arta</h1>
            <p className="mt-1 text-sm text-primary-foreground/85">
              Insight & analisis otomatis dari data toko {user.tenant.name}. {summary}
            </p>
          </div>
        </div>
      </div>

      <ArtaInsights insights={insights} />

      <p className="text-center text-xs text-muted-foreground">
        Arta menganalisis penjualan, servis, inventaris, pembelian & keuangan secara otomatis di
        perangkat ini — tanpa mengirim data ke luar.
      </p>
    </div>
  );
}
