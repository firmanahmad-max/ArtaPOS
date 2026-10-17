import type { Metadata } from "next";
import Link from "next/link";
import { Users, Star, Phone, Settings2 } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { getLoyaltyConfig, listCustomers } from "@/server/customers/service";
import { createCustomerAction, deactivateCustomerAction } from "@/server/customers/actions";
import { cashbackPercent, formatStartDate, isProgramStarted, pointsWorth, RUPIAH_PER_POINT } from "@/lib/loyalty";
import { formatRupiah } from "@/lib/utils";
import { ContactManager } from "@/components/contacts/contact-manager";
import { LinkHistoryButton } from "./link-history-button";
import { PortalStatsCard } from "./portal-stats-card";
import { getPortalStats } from "@/server/portal/service";
import { daysFromNow } from "@/lib/timezone";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pelanggan" };

export default async function CustomersPage() {
  const { tenantId, role } = await getAuthContext();
  const [customers, loyalty, portalStats] = await Promise.all([
    listCustomers(tenantId),
    getLoyaltyConfig(tenantId),
    getPortalStats(tenantId, 30, daysFromNow(0)),
  ]);
  const totalPoints = customers.reduce((s, c) => s + (c.points ?? 0), 0);
  const withPhone = customers.filter((c) => c.phone).length;
  const scheduled = !isProgramStarted(loyalty) && !!loyalty.startsAt;
  const active = loyalty.pointValue > 0 && !scheduled;
  const ready = customers.filter((c) => active && c.points >= loyalty.minRedeem && c.points > 0);
  const top = [...customers].filter((c) => c.points > 0).sort((a, b) => b.points - a.points).slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pelanggan</h1>
          <p className="text-muted-foreground">Daftar pelanggan toko Anda.</p>
        </div>
        <LinkHistoryButton />
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={Users} label="Total Pelanggan" value={String(customers.length)} hint="Terdaftar & aktif" tone="blue" />
        <StatCard
          icon={Star}
          label="Total Poin Loyalitas"
          value={totalPoints.toLocaleString("id-ID")}
          hint={
            scheduled
              ? `Program mulai ${formatStartDate(loyalty.startsAt!)}`
              : active
                ? `Senilai ${formatRupiah(pointsWorth(totalPoints, loyalty))} potongan`
                : "Penukaran poin nonaktif"
          }
          tone="violet"
        />
        <StatCard icon={Phone} label="Dengan No. HP" value={String(withPhone)} hint="Bisa dihubungi/WhatsApp" tone="emerald" />
      </div>

      {/* Penjelasan program poin + pemegang poin terbanyak */}
      <Card>
        <CardHeader className="flex-row flex-wrap items-start justify-between gap-2 space-y-0">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Star className="size-5 fill-amber-400 text-amber-500" /> Program Poin Member
            </CardTitle>
            <CardDescription>
              {scheduled ? (
                <>
                  <strong className="text-foreground">Dijadwalkan mulai {formatStartDate(loyalty.startsAt!)}</strong> — sampai
                  tanggal itu belanja belum menghasilkan poin. Struk pelanggan terdaftar menampilkan pengumumannya.
                </>
              ) : active ? (
                <>
                  1 poin per {formatRupiah(RUPIAH_PER_POINT)} belanja · 1 poin = {formatRupiah(loyalty.pointValue)} potongan
                  (cashback {cashbackPercent(loyalty).toLocaleString("id-ID")}%) · tukar mulai{" "}
                  {loyalty.minRedeem.toLocaleString("id-ID")} poin di kasir.
                </>
              ) : (
                "Poin terkumpul dari belanja, tapi penukaran sedang nonaktif."
              )}
            </CardDescription>
          </div>
          {can(role, "settings.manage") && (
            <Link href="/settings#poin" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
              <Settings2 className="size-4" /> Atur program
            </Link>
          )}
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
          <ul className="space-y-2 text-sm">
            <li>
              <span className="font-semibold">Dampak ke pelanggan:</span> poin dari belanja, rakit PC &amp; servis (jasa servis
              ×{loyalty.serviceMultiplier ?? 2}) jadi potongan langsung di kasir, servis atau rakit PC
              {active && <> — mis. 1.000 poin = {formatRupiah(pointsWorth(1000, loyalty))}</>}. Saldo &amp; poin yang didapat
              tercetak di setiap struk &amp; nota. Barang titip jual tidak menghasilkan poin.
            </li>
            <li>
              <span className="font-semibold">Dampak ke toko:</span> total poin beredar adalah kewajiban potongan
              {active && <> sebesar <strong>{formatRupiah(pointsWorth(totalPoints, loyalty))}</strong></>} — imbalan agar
              pelanggan kembali belanja.
            </li>
            {active && (
              <li>
                <span className="font-semibold">{ready.length} pelanggan</span> sudah bisa menukar poin sekarang.
              </li>
            )}
          </ul>
          {top.length > 0 && (
            <div className="rounded-lg border">
              <p className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Poin terbanyak</p>
              <ul className="divide-y text-sm">
                {top.map((c) => (
                  <li key={c.id}>
                    <Link href={`/customers/${c.id}/edit`} className="flex items-center justify-between gap-2 px-3 py-2 hover:bg-accent/40">
                      <span className="truncate">{c.name}</span>
                      <span className="shrink-0 font-mono tabular-nums">
                        {c.points.toLocaleString("id-ID")}
                        {active && <span className="text-muted-foreground"> · {formatRupiah(pointsWorth(c.points, loyalty))}</span>}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {portalStats && <PortalStatsCard stats={portalStats} />}

      <ContactManager
        items={customers}
        createAction={createCustomerAction}
        deleteAction={deactivateCustomerAction}
        editBase="/customers"
        noun="Pelanggan"
      />
    </div>
  );
}
