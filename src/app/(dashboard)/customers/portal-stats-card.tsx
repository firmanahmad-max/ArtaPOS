import Link from "next/link";
import { UserRound } from "lucide-react";
import type { getPortalStats } from "@/server/portal/service";
import { formatLocalDateTime } from "@/lib/timezone";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Stats = NonNullable<Awaited<ReturnType<typeof getPortalStats>>>;

const CHANNELS: { key: keyof Stats["byChannel"]; label: string }[] = [
  { key: "receipt", label: "Struk penjualan" },
  { key: "service", label: "Nota servis" },
  { key: "reminder", label: "Pengingat servis" },
  { key: "invite", label: "Undangan member" },
  { key: "direct", label: "Langsung / disimpan" },
];

/** Statistik Portal Member: seberapa banyak member membuka link pribadinya & dari mana. */
export function PortalStatsCard({ stats }: { stats: Stats }) {
  const max = Math.max(1, ...CHANNELS.map((c) => stats.byChannel[c.key]));
  const kpis = [
    { label: "Link aktif", value: stats.linked, hint: "member" },
    { label: "Pernah dibuka", value: stats.opened, hint: `${stats.openRate}% dari link aktif` },
    { label: `Aktif ${stats.days} hari`, value: stats.activeRecent, hint: "member membuka" },
    { label: `Kunjungan ${stats.days} hari`, value: stats.visits, hint: "sekali per sesi" },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="size-5 text-primary" /> Portal Member
        </CardTitle>
        <CardDescription>
          Seberapa sering member membuka link pribadinya (poin, rekam servis, garansi) dan dari pesan mana mereka datang.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {stats.linked === 0 && stats.visits === 0 ? (
          <p className="text-sm text-muted-foreground">
            Belum ada link portal. Link dibuat otomatis saat struk, nota servis, atau pengingat dikirim via WhatsApp ke
            member — atau buat manual di halaman edit pelanggan.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {kpis.map((k) => (
                <div key={k.label} className="rounded-lg border p-3">
                  <p className="text-xs text-muted-foreground">{k.label}</p>
                  <p className="font-mono text-2xl font-semibold tabular-nums">{k.value.toLocaleString("id-ID")}</p>
                  <p className="text-xs text-muted-foreground">{k.hint}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <div className="rounded-lg border p-3">
                <p className="mb-2 text-xs font-medium text-muted-foreground">Asal kunjungan ({stats.days} hari)</p>
                <ul className="space-y-2 text-sm">
                  {CHANNELS.map((c) => {
                    const n = stats.byChannel[c.key];
                    return (
                      <li key={c.key} className="grid grid-cols-[9.5rem_1fr_2.5rem] items-center gap-2">
                        <span className="truncate">{c.label}</span>
                        <span className="h-2 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
                        </span>
                        <span className="text-right font-mono tabular-nums">{n}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
              <div className="rounded-lg border">
                <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Terakhir membuka portal</p>
                {stats.recent.length === 0 ? (
                  <p className="px-3 py-3 text-sm text-muted-foreground">Belum ada member yang membuka.</p>
                ) : (
                  <ul className="divide-y text-sm">
                    {stats.recent.map((m) => (
                      <li key={m.id}>
                        <Link
                          href={`/customers/${m.id}/edit`}
                          className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent/40"
                        >
                          <span className="truncate">{m.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            <span className="font-mono">{m.views}×</span> ·{" "}
                            {formatLocalDateTime(m.lastSeenAt, { dateStyle: "medium", timeStyle: "short" })}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
