import Link from "next/link";
import { Store, CheckCircle2, Users, ShieldCheck, Ticket, CalendarClock } from "lucide-react";
import { platformStats } from "@/server/platform/service";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";

const PLAN_LABEL: Record<string, string> = {
  DEMO_DAILY: "Demo Harian",
  DEMO_MONTHLY: "Demo Bulanan",
  DEMO_TRANSACTIONS: "Demo (batas transaksi)",
  UNLIMITED: "Unlimited",
};

export default async function AdminOverviewPage() {
  const s = await platformStats();
  const plans = Object.entries(s.plans).sort((a, b) => b[1] - a[1]);
  const maxPlan = Math.max(1, ...Object.values(s.plans));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Ringkasan Platform</h1>
        <p className="text-muted-foreground">Statistik seluruh toko yang memakai ArtaPOS.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Store} label="Total Toko" value={String(s.tenants)} hint="Semua tenant" tone="blue" href="/admin/tenants" />
        <StatCard icon={CheckCircle2} label="Toko Aktif" value={String(s.activeTenants)} hint={`${s.tenants - s.activeTenants} nonaktif`} tone="emerald" />
        <StatCard icon={CalendarClock} label="Lisensi Segera Berakhir" value={String(s.expiringSoon)} hint="≤ 7 hari ke depan" tone="amber" href="/admin/tenants" />
        <StatCard icon={Ticket} label="Kode Promo Aktif" value={String(s.promoActive)} hint="Bisa ditukar" tone="violet" href="/admin/promo" />
        <StatCard icon={Users} label="Total Pengguna" value={String(s.users)} hint="Semua toko" tone="blue" />
        <StatCard icon={ShieldCheck} label="Admin Platform" value={String(s.superAdmins)} hint="Akses lintas-toko" tone="rose" href="/admin/access" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Distribusi Paket Lisensi</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {plans.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada lisensi tercatat.</p>
          ) : (
            plans.map(([plan, count]) => (
              <div key={plan} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{PLAN_LABEL[plan] ?? plan}</span>
                  <span className="text-muted-foreground">{count} toko</span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted">
                  <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round((count / maxPlan) * 100)}%` }} />
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/tenants" className={buttonVariants({ variant: "outline" })}>Kelola Toko & Lisensi</Link>
        <Link href="/admin/promo" className={buttonVariants({ variant: "outline" })}>Buat Kode Promo</Link>
        <Link href="/admin/access" className={buttonVariants({ variant: "outline" })}>Atur Akses Admin</Link>
      </div>
    </div>
  );
}
