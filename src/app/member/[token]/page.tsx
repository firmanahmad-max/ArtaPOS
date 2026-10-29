import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Coins,
  Wrench,
  ShieldCheck,
  ShoppingBag,
  Cpu,
  Package,
  CalendarClock,
  MessageCircle,
  Images,
  Lock,
  Laptop,
  RotateCcw,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPortalData, type PortalData } from "@/server/portal/service";
import { storeOgImageUrl } from "@/server/public/track-info";
import { groupByDevice, nextMaintenance } from "@/lib/portal";
import { addMonthsLocal, daysToDue } from "@/lib/service-reminder";
import { pointsWorth, redeemHint, isProgramStarted, formatStartDate } from "@/lib/loyalty";
import { waLink } from "@/lib/whatsapp";
import { formatRupiah, cn } from "@/lib/utils";
import { daysFromNow, formatLocalDate } from "@/lib/timezone";
import { PortalBeacon } from "./portal-beacon";
import { getCustomerReferral, getReferralConfig } from "@/server/referrals/service";
import { ReferralShareCard } from "@/components/referrals/referral-share-card";
import { SERVICE_STATUS_META } from "@/app/(dashboard)/service/status-config";
import { BUILD_STATUS_META } from "@/app/(dashboard)/pc-build/build-status";
import { CONSIGNMENT_STATUS_META } from "@/app/(dashboard)/consignments/status-config";
import { rmaPublicStatusLabel } from "@/app/(dashboard)/rma/status-config";

/** Link pribadi: jangan diindeks & jangan bocorkan token lewat Referer saat klik keluar. */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const data = await getPortalData(token).catch(() => null);
  const base: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
  if (!data) return { ...base, title: "Portal Pelanggan" };
  const title = `Member ${data.store.name}`;
  const description = "Cek poin member, riwayat servis, garansi & belanja Anda.";
  const ogImage = storeOgImageUrl(data.store.slug, data.store.updatedAt);
  return {
    ...base,
    title,
    description,
    openGraph: { title, description, siteName: data.store.name, type: "website", locale: "id_ID", images: [{ url: ogImage, width: 1200, height: 630 }] },
  };
}

const D = (d: Date) => formatLocalDate(d, { day: "numeric", month: "short", year: "numeric" });
const ACTIVE_SERVICE = ["RECEIVED", "IN_PROGRESS", "WAITING_PARTS", "DONE"];
const DONE_SERVICE = ["DONE", "DELIVERED"];
const POINT_LABEL: Record<string, string> = { EARN: "Dapat poin", REDEEM: "Tukar poin", ADJUST: "Penyesuaian" };
const WARRANTY_META: Record<string, { label: string; variant: "success" | "muted" | "warning" | "destructive" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  EXPIRED: { label: "Habis", variant: "muted" },
  CLAIMED: { label: "Diklaim", variant: "warning" },
  VOID: { label: "Batal", variant: "destructive" },
};

function Section({
  id,
  icon: Icon,
  title,
  count,
  children,
}: {
  id: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  count?: number;
  children: React.ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-5 text-primary" /> {title}
          {count !== undefined && <span className="ml-auto font-mono text-xs font-normal text-muted-foreground">{count}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function dueText(days: number) {
  if (days < 0) return `lewat ${-days} hari`;
  if (days === 0) return "hari ini";
  if (days <= 31) return `${days} hari lagi`;
  const m = Math.round(days / 30);
  return `±${m} bulan lagi`;
}

function DeviceHistory({ data, now }: { data: PortalData; now: number }) {
  const catById = new Map(data.catalog.map((c) => [c.id, c]));
  const groups = groupByDevice(data.tickets.map((t) => ({ ...t, at: t.completedAt ?? t.createdAt })));
  if (groups.length === 0) return <p className="text-sm text-muted-foreground">Belum ada riwayat servis.</p>;
  return (
    <>
      {groups.map((g) => {
        const done = g.tickets
          .filter((t) => DONE_SERVICE.includes(t.status))
          .flatMap((t) =>
            t.items
              .map((i) => (i.catalogItemId ? catById.get(i.catalogItemId) : undefined))
              .filter((c): c is NonNullable<typeof c> => !!c && c.isActive)
              .map((c) => ({ catalogItemId: c.id, name: c.name, intervalMonths: c.intervalMonths, at: t.completedAt ?? t.createdAt })),
          );
        const next = nextMaintenance(done, addMonthsLocal);
        return (
          <div key={g.key} className="rounded-xl border">
            <div className="flex items-center gap-2 border-b bg-muted/40 px-3 py-2">
              <Laptop className="size-4 text-muted-foreground" />
              <p className="min-w-0 flex-1 truncate text-sm font-semibold">{g.label}</p>
              <span className="text-xs text-muted-foreground">{g.tickets.length}× servis</span>
            </div>
            {next.length > 0 && (
              <div className="space-y-1 border-b bg-primary/5 px-3 py-2">
                {next.map((n) => {
                  const days = daysToDue(n.dueAt, now);
                  return (
                    <p key={n.catalogItemId} className="flex items-start gap-1.5 text-xs">
                      <CalendarClock className="mt-0.5 size-3.5 shrink-0 text-primary" />
                      <span>
                        Perawatan berikutnya: <b>{n.name}</b> — {D(n.dueAt)}{" "}
                        <span className={cn("whitespace-nowrap font-medium", days < 0 ? "text-destructive" : days <= 14 ? "text-amber-600" : "text-muted-foreground")}>
                          ({dueText(days)})
                        </span>
                      </span>
                    </p>
                  );
                })}
              </div>
            )}
            <ol className="divide-y">
              {g.tickets.map((t) => {
                const meta = SERVICE_STATUS_META[t.status];
                return (
                  <li key={t.id} className="space-y-1 px-3 py-2.5 text-sm">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs text-muted-foreground">{t.number}</span>
                      <span className="text-xs text-muted-foreground">{D(t.createdAt)}</span>
                      <Badge variant={meta.variant} className="ml-auto">
                        {meta.emoji} {meta.label}
                      </Badge>
                    </div>
                    <p><span className="text-muted-foreground">Keluhan:</span> {t.complaint}</p>
                    {t.diagnosis && <p><span className="text-muted-foreground">Diagnosa:</span> {t.diagnosis}</p>}
                    {t.items.length > 0 && (
                      <p className="text-xs">
                        <span className="text-muted-foreground">Dikerjakan:</span>{" "}
                        {t.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}
                      </p>
                    )}
                    {t.status !== "CANCELLED" && (
                      <p className="font-mono text-xs text-muted-foreground">Total {formatRupiah(t.total)}</p>
                    )}
                  </li>
                );
              })}
            </ol>
          </div>
        );
      })}
    </>
  );
}

export default async function MemberPortalPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ ref?: string }>;
}) {
  const [{ token }, { ref }] = await Promise.all([params, searchParams]);
  const data = await getPortalData(token);
  if (!data) notFound();
  const now = daysFromNow(0);
  const { store, customer, loyalty } = data;

  const started = isProgramStarted(loyalty);
  const hint = redeemHint(customer.points, loyalty);
  const activeTickets = data.tickets.filter((t) => ACTIVE_SERVICE.includes(t.status));
  const activeBuilds = data.builds.filter((b) => b.status !== "DELIVERED" && b.status !== "CANCELLED");
  const consignItems = data.consignments.flatMap((c) => c.items.map((i) => ({ ...i, number: c.number, at: c.createdAt })));
  const activeWarranties = data.warranties.filter((w) => w.status === "ACTIVE").length;
  // Program Ajak Teman (hanya bila aktif & program poin sudah berjalan).
  const refCfg = await getReferralConfig(customer.tenantId);
  const referral =
    refCfg.enabled && refCfg.loyaltyStarted ? await getCustomerReferral(customer.tenantId, customer.id).catch(() => null) : null;

  const nav = [
    { id: "servis", label: "Servis", show: data.tickets.length > 0 },
    { id: "garansi", label: "Garansi", show: data.warranties.length + data.rmaClaims.length > 0 },
    { id: "belanja", label: "Belanja", show: data.sales.length > 0 },
    { id: "rakit", label: "Rakit PC", show: data.builds.length > 0 },
    { id: "titip", label: "Titip Jual", show: consignItems.length > 0 },
    { id: "poin", label: "Poin", show: data.pointEntries.length > 0 },
  ].filter((n) => n.show);

  return (
    <div className="min-h-screen bg-muted/40 px-4 py-6">
      <PortalBeacon token={token} refParam={typeof ref === "string" ? ref : undefined} />
      <div className="mx-auto w-full max-w-2xl space-y-4">
        <div className="flex items-center gap-3">
          {store.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo} alt={store.name} className="size-12 rounded-xl border bg-white object-contain p-1" />
          ) : (
            <div className="flex size-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
              {store.name.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold">{store.name}</p>
            <p className="text-xs text-muted-foreground">Portal Member</p>
          </div>
          <ThemeToggle />
        </div>

        {/* Kartu member + poin */}
        <div className="gradient-arta relative overflow-hidden rounded-2xl p-5 text-white shadow-lg">
          <p className="text-xs uppercase tracking-[.12em] text-white/70">Halo,</p>
          <h1 className="text-2xl font-bold">{customer.name}</h1>
          <div className="mt-4 flex items-end justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 text-xs text-white/70">
                <Coins className="size-4 text-amber-300" /> Poin member
              </p>
              <p className="font-mono text-3xl font-bold">{customer.points.toLocaleString("id-ID")}</p>
            </div>
            {loyalty.pointValue > 0 && customer.points > 0 && (
              <div className="text-right">
                <p className="text-xs text-white/70">Senilai</p>
                <p className="font-mono text-lg font-semibold">{formatRupiah(pointsWorth(customer.points, loyalty))}</p>
              </div>
            )}
          </div>
          <p className="mt-3 text-xs text-white/80">
            {!started && loyalty.startsAt
              ? `Program poin dimulai ${formatStartDate(loyalty.startsAt)}.`
              : (hint ?? "Kumpulkan poin dari belanja & servis, tukarkan sebagai potongan di kasir.")}
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-lg bg-white/10 px-2 py-1.5">
              <p className="font-mono text-base font-semibold">{activeTickets.length}</p>
              <p className="text-white/70">Servis aktif</p>
            </div>
            <div className="rounded-lg bg-white/10 px-2 py-1.5">
              <p className="font-mono text-base font-semibold">{activeWarranties}</p>
              <p className="text-white/70">Garansi aktif</p>
            </div>
            <div className="rounded-lg bg-white/10 px-2 py-1.5">
              <p className="font-mono text-base font-semibold">{data.sales.length}</p>
              <p className="text-white/70">Transaksi</p>
            </div>
          </div>
        </div>

        {nav.length > 1 && (
          <nav className="flex gap-2 overflow-x-auto pb-1">
            {nav.map((n) => (
              <a key={n.id} href={`#${n.id}`} className="shrink-0 rounded-full border bg-card px-3 py-1 text-xs font-medium hover:bg-accent">
                {n.label}
              </a>
            ))}
          </nav>
        )}

        {referral?.code && (
          <ReferralShareCard
            slug={store.slug}
            code={referral.code}
            storeName={store.name}
            referrerPoints={refCfg.referrerPoints}
            friendPoints={refCfg.friendPoints}
            minPurchase={refCfg.minPurchase}
            validDays={refCfg.validDays}
            stats={referral.friends}
          />
        )}

        {/* Sedang berjalan */}
        {(activeTickets.length > 0 || activeBuilds.length > 0) && (
          <Section id="berjalan" icon={RotateCcw} title="Sedang Diproses">
            {activeTickets.map((t) => {
              const meta = SERVICE_STATUS_META[t.status];
              return (
                <div key={t.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Wrench className="size-4 text-muted-foreground" />
                    <span className="font-medium">{[t.deviceType, t.deviceBrand, t.deviceInfo].filter(Boolean).join(" ")}</span>
                    <Badge variant={meta.variant} className="ml-auto">
                      {meta.emoji} {t.status === "DONE" ? "Siap diambil" : meta.label}
                    </Badge>
                  </div>
                  {t.statusNote && <p className="mt-1 text-xs text-muted-foreground">↳ {t.statusNote}</p>}
                  <p className="mt-1 font-mono text-xs text-muted-foreground">
                    {t.number} · Total {formatRupiah(t.total)}
                    {t.total > t.paid && t.status !== "CANCELLED" ? ` · Sisa ${formatRupiah(t.total - t.paid)}` : ""}
                  </p>
                </div>
              );
            })}
            {activeBuilds.map((b) => {
              const meta = BUILD_STATUS_META[b.status];
              return (
                <div key={b.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <Cpu className="size-4 text-muted-foreground" />
                    <span className="font-medium">{b.name || "Rakit PC"}</span>
                    <Badge variant={meta.variant} className="ml-auto">{meta.emoji} {meta.label}</Badge>
                  </div>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{b.number} · Total {formatRupiah(b.total)}</p>
                </div>
              );
            })}
          </Section>
        )}

        {data.tickets.length > 0 && (
          <Section id="servis" icon={Wrench} title="Rekam Servis per Perangkat" count={data.tickets.length}>
            <DeviceHistory data={data} now={now} />
          </Section>
        )}

        {(data.warranties.length > 0 || data.rmaClaims.length > 0) && (
          <Section id="garansi" icon={ShieldCheck} title="Garansi & Klaim">
            {data.warranties.map((w) => {
              const meta = WARRANTY_META[w.status];
              return (
                <div key={w.id} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{w.productName}</p>
                    <p className="font-mono text-xs text-muted-foreground">SN {w.serialNumber}</p>
                    {w.warrantyUntil && (
                      <p className="text-xs text-muted-foreground">
                        Garansi s/d {D(w.warrantyUntil)}
                        {w.status === "ACTIVE" && w.daysLeft !== null ? ` · ${w.daysLeft} hari lagi` : ""}
                      </p>
                    )}
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
              );
            })}
            {data.rmaClaims.map((r) => (
              <div key={r.id} className="rounded-lg border border-dashed p-3 text-sm">
                <p className="font-medium">Klaim {r.number} — {r.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {rmaPublicStatusLabel(r.status, r.resolution)} · {D(r.createdAt)}
                </p>
              </div>
            ))}
          </Section>
        )}

        {data.sales.length > 0 && (
          <Section id="belanja" icon={ShoppingBag} title="Riwayat Belanja" count={data.sales.length}>
            {data.sales.map((s) => (
              <details key={s.id} className="group rounded-lg border">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-mono text-xs text-muted-foreground">{s.number}</p>
                    <p className="text-xs text-muted-foreground">{D(s.createdAt)}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono font-semibold">{formatRupiah(s.total)}</p>
                    {s.paymentStatus !== "PAID" && <Badge variant="warning">Belum lunas</Badge>}
                  </div>
                </summary>
                <ul className="space-y-1 border-t px-3 py-2 text-xs">
                  {s.items.map((i, k) => (
                    <li key={k} className="flex justify-between gap-3">
                      <span>{i.productName} ×{i.qty}</span>
                      <span className="font-mono">{formatRupiah(i.subtotal)}</span>
                    </li>
                  ))}
                  {s.pointsEarned > 0 && <li className="pt-1 text-amber-600">+{s.pointsEarned} poin</li>}
                </ul>
              </details>
            ))}
          </Section>
        )}

        {data.builds.length > 0 && (
          <Section id="rakit" icon={Cpu} title="Rakit PC" count={data.builds.length}>
            {data.builds.map((b) => {
              const meta = BUILD_STATUS_META[b.status];
              return (
                <details key={b.id} className="rounded-lg border">
                  <summary className="flex cursor-pointer list-none items-center gap-2 p-3 text-sm">
                    <span className="font-medium">{b.name || b.number}</span>
                    <Badge variant={meta.variant}>{meta.label}</Badge>
                    <span className="ml-auto font-mono font-semibold">{formatRupiah(b.total)}</span>
                  </summary>
                  <ul className="space-y-0.5 border-t px-3 py-2 text-xs">
                    {b.items.map((i, k) => (
                      <li key={k}>• {i.productName}{i.qty > 1 ? ` ×${i.qty}` : ""}</li>
                    ))}
                  </ul>
                </details>
              );
            })}
          </Section>
        )}

        {consignItems.length > 0 && (
          <Section id="titip" icon={Package} title="Barang Titip Jual" count={consignItems.length}>
            {consignItems.map((i, k) => {
              const meta = CONSIGNMENT_STATUS_META[i.status];
              return (
                <div key={k} className="flex items-start gap-3 rounded-lg border p-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{i.category} — {i.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {i.number} · harga {formatRupiah(i.askingPrice)}
                      {i.status === "SOLD" && i.ownerShare !== null
                        ? ` · hak Anda ${formatRupiah(i.ownerShare)}${i.ownerPaidAt ? " (sudah dibayar)" : ""}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={meta.variant}>{meta.label}</Badge>
                </div>
              );
            })}
          </Section>
        )}

        {data.pointEntries.length > 0 && (
          <Section id="poin" icon={Coins} title="Riwayat Poin">
            <ul className="divide-y text-sm">
              {data.pointEntries.map((e) => (
                <li key={e.id} className="flex items-center gap-3 py-2">
                  <div className="min-w-0 flex-1">
                    <p>{e.type === "REDEEM" && e.points > 0 ? "Pengembalian poin" : POINT_LABEL[e.type] ?? e.type}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {D(e.createdAt)}{e.note ? ` · ${e.note}` : ""}
                    </p>
                  </div>
                  <span className={cn("font-mono font-semibold", e.points >= 0 ? "text-success" : "text-destructive")}>
                    {e.points >= 0 ? "+" : ""}{e.points.toLocaleString("id-ID")}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <div className="grid gap-2 sm:grid-cols-2">
          {store.phone && (
            <a
              href={waLink(`Halo ${store.name}, saya ${customer.name} (member).`, store.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: "whatsapp" })}
            >
              <MessageCircle /> Chat toko via WhatsApp
            </a>
          )}
          {data.hasGallery && (
            <Link href={`/galeri/${store.slug}`} className={buttonVariants({ variant: "outline" })}>
              <Images /> Lihat Galeri Produk
            </Link>
          )}
        </div>

        <p className="flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
          <Lock className="size-3.5" /> Link ini pribadi untuk Anda — mohon tidak dibagikan.
        </p>
        <p className="text-center text-xs text-muted-foreground">Dilayani oleh ArtaPOS</p>
      </div>
    </div>
  );
}
