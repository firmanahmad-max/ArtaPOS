import type { Metadata } from "next";
import Link from "next/link";
import { Coins, Gift, TrendingUp, UserPlus } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getReferralConfig, listReferrals } from "@/server/referrals/service";
import { getLoyaltyConfig } from "@/server/customers/service";
import { referralView, summarizeReferrals } from "@/lib/referral";
import { formatLocalDate, daysFromNow } from "@/lib/timezone";
import { formatRupiah } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { FilterChips } from "@/components/ui/filter-chips";
import { ReferralList, ReferralSettingsForm, type ReferralRow } from "./referral-admin";

export const metadata: Metadata = { title: "Ajak Teman" };

const D = (d: Date) => formatLocalDate(d, { day: "numeric", month: "short", year: "numeric" });

export default async function ReferralsPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { filter = "semua" } = await searchParams;
  const now = daysFromNow(0);
  const [cfg, loyalty, raw] = await Promise.all([
    getReferralConfig(user.tenantId),
    getLoyaltyConfig(user.tenantId),
    listReferrals(user.tenantId).catch(() => null),
  ]);
  const migrated = raw !== null;
  const list = raw ?? [];
  const sum = summarizeReferrals(list, now);

  const rows: ReferralRow[] = list.map((r) => ({
    id: r.id,
    view: referralView(r, now),
    referrerId: r.referrerId,
    referrerName: r.referrer?.name ?? null,
    referrerPhone: r.referrer?.phone ?? null,
    friendId: r.friendId,
    friendName: r.friend?.name ?? null,
    createdText: D(r.createdAt),
    expiresText: D(r.expiresAt),
    rewardedText: r.rewardedAt ? D(r.rewardedAt) : null,
    qualifyingDoc: r.qualifyingDoc,
    qualifyingTotal: r.qualifyingTotal,
    referrerPoints: r.referrerPoints,
    friendPoints: r.friendPoints,
  }));
  const shown = filter === "semua" ? rows : rows.filter((r) => r.view === filter);

  // Pengajak teratas (bonus diberikan).
  const top = [...rows.filter((r) => r.view === "rewarded").reduce((m, r) => {
    const cur = m.get(r.referrerId) ?? { id: r.referrerId, name: r.referrerName, count: 0, revenue: 0 };
    cur.count++;
    cur.revenue += r.qualifyingTotal ?? 0;
    return m.set(r.referrerId, cur);
  }, new Map<string, { id: string; name: string | null; count: number; revenue: number }>()).values()]
    .sort((a, b) => b.count - a.count || b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ajak Teman</h1>
        <p className="text-muted-foreground">
          Member membagikan link pribadinya (ada di Portal Member & halaman pelanggan). Teman baru yang bertransaksi pertama kali
          memberi bonus poin untuk keduanya — otomatis.
        </p>
      </div>

      {!migrated && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          Program belum aktif di database — jalankan migrasi <code>20261030090000_referral_program</code> terlebih dahulu.
        </Card>
      )}
      {cfg.enabled && !cfg.loyaltyStarted && (
        <Card className="border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          Program Poin Member belum dimulai, jadi bonus ajak teman belum diberikan.{" "}
          <Link href="/settings#poin" className="font-medium text-primary hover:underline">Atur jadwal program poin</Link>.
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={UserPlus} tone="violet" label="Teman bergabung" value={sum.joined} hint={`${sum.pending} menunggu transaksi`} />
        <StatCard icon={TrendingUp} tone="emerald" label="Berhasil bertransaksi" value={sum.rewarded} hint={`${sum.conversion}% dari yang bergabung`} progress={sum.conversion} />
        <StatCard icon={Coins} tone="amber" label="Omzet transaksi pertama" value={formatRupiah(sum.revenue)} hint="dari teman yang diajak" />
        <StatCard
          icon={Gift}
          tone="rose"
          label="Bonus poin dibagikan"
          value={sum.pointsGiven.toLocaleString("id-ID")}
          hint={loyalty.pointValue > 0 ? `≈ ${formatRupiah(sum.pointsGiven * loyalty.pointValue)}` : "poin"}
        />
      </div>

      {top.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pengajak Teratas</CardTitle>
            <CardDescription>Member yang paling banyak membawa pelanggan baru — pertimbangkan apresiasi khusus.</CardDescription>
          </CardHeader>
          <CardContent className="divide-y p-0">
            {top.map((t, i) => (
              <div key={t.id} className="flex items-center justify-between gap-2 px-6 py-2.5 text-sm">
                <span>
                  <span className="mr-2 font-mono text-muted-foreground">{i + 1}.</span>
                  <Link href={`/customers/${t.id}/edit`} className="font-semibold hover:underline">{t.name ?? "Member"}</Link>
                </span>
                <span className="text-muted-foreground">
                  <b className="text-foreground">{t.count}</b> teman · {formatRupiah(t.revenue)}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <FilterChips
        defaultValue="semua"
        chips={[
          { value: "semua", label: "Semua", count: rows.filter((r) => r.view !== "cancelled").length },
          { value: "pending", label: "Menunggu", count: sum.pending, tone: "warning" },
          { value: "rewarded", label: "Berhasil", count: sum.rewarded, tone: "success" },
          { value: "expired", label: "Kedaluwarsa", count: sum.expired },
        ]}
      />
      <ReferralList rows={shown} storeName={user.tenant.name} />

      <Card id="pengaturan">
        <CardHeader>
          <CardTitle>Pengaturan Program</CardTitle>
          <CardDescription>
            Bonus diberikan SEKALI per teman baru, saat transaksi pertamanya (belanja, servis, atau rakit PC) LUNAS dan memenuhi
            minimal. Pengajak maksimal 10 bonus per 30 hari; No. WA yang sudah pernah jadi pelanggan tidak bisa didaftarkan sebagai teman baru.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralSettingsForm
            initial={{
              enabled: cfg.enabled,
              referrerPoints: cfg.referrerPoints,
              friendPoints: cfg.friendPoints,
              minPurchase: cfg.minPurchase,
              validDays: cfg.validDays,
            }}
            canManage={can(user.role, "settings.manage")}
            pointValue={loyalty.pointValue}
          />
        </CardContent>
      </Card>
    </div>
  );
}
