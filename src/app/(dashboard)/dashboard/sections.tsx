import Link from "next/link";
import { ArrowRight, Plus, Search, ShoppingCart, Sparkles } from "lucide-react";
import { can } from "@/lib/rbac";
import type { UserRole } from "@/generated/prisma/enums";
import { cn, formatRupiah } from "@/lib/utils";
import { formatLocalDateTime } from "@/lib/timezone";
import { pctChange, rupiahShort } from "@/lib/dashboard-calc";
import { listDueReports, getReportSettings } from "@/server/scheduled-reports/service";
import { countOpenFollowUps } from "@/server/reviews/service";
import { getArtaInsights } from "@/server/insights/service";
import {
  getActionCounts,
  getMonthKpis,
  getPerformance,
  getRecentActivity,
  getServicePipeline,
  getTodayPulse,
  getTopSold,
  type ActivityKind,
} from "@/server/dashboard/service";
import { ActionCenter, type ActionItem } from "./action-center";
import { PerformanceChart } from "./performance-chart";

type Ctx = { tenantId: string; role: UserRole; now: number };

/** Bagian dashboard tak boleh menjatuhkan halaman: gagal → kartu kecil. */
function SectionError({ what }: { what: string }) {
  return (
    <div className="rounded-2xl border bg-card px-4 py-3 text-sm text-muted-foreground">
      {what} belum bisa dimuat. Muat ulang halaman sebentar lagi.
    </div>
  );
}

// ── A · Hero ────────────────────────────────────────────────────────────────

export function HeroShell({
  greeting,
  dateLabel,
  name,
  roleLabel,
  storeName,
  shiftOpen,
  canPos,
  children,
}: {
  greeting: string;
  dateLabel: string;
  name: string;
  roleLabel: string;
  storeName: string;
  shiftOpen: boolean | null;
  canPos: boolean;
  children?: React.ReactNode;
}) {
  return (
    <section className="relative overflow-hidden rounded-[22px] gradient-hero p-5 text-white elevate-lg sm:p-7">
      <span aria-hidden className="hero-dots pointer-events-none absolute inset-0 opacity-20" />
      <div className="relative flex flex-wrap items-start justify-between gap-6">
        <div className="min-w-[240px] flex-[1_1_320px]">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[.1em] text-white/75">{dateLabel} · WIB</span>
            {shiftOpen !== null && (
              <Link
                href="/shift"
                className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-0.5 text-[11.5px] font-semibold hover:bg-white/25"
              >
                <span className={cn("size-2 rounded-full", shiftOpen ? "bg-emerald-300" : "bg-amber-300")} />
                {shiftOpen ? "Shift berjalan" : "Shift belum dibuka"}
              </Link>
            )}
          </div>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-[30px]">
            {greeting}, {name}
          </h1>
          <p className="mt-1 text-sm text-white/85">
            {roleLabel} · {storeName}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {canPos && (
              <Link
                href="/pos"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-white px-4 text-sm font-semibold text-[#3b1d7e] shadow-sm transition hover:brightness-95"
              >
                <ShoppingCart className="size-4" /> Buka Kasir
              </Link>
            )}
            <Link
              href="/service/new"
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/30 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/20"
            >
              <Plus className="size-4" /> Tiket Servis Baru
            </Link>
            <span className="hidden h-10 items-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3.5 text-sm font-medium text-white/90 sm:inline-flex">
              <Search className="size-4" /> Cari
              <kbd className="rounded-md bg-white/20 px-1.5 py-0.5 font-mono text-[10.5px]">Ctrl K</kbd>
            </span>
          </div>
        </div>
        {children}
      </div>
    </section>
  );
}

export async function TodayPulse({ tenantId, role, now }: Ctx) {
  if (!can(role, "reports.view")) return null;
  const p = await getTodayPulse(tenantId, now).catch(() => null);
  if (!p) return null;
  const delta = p.revenue > 0 && p.yesterdayRevenue > 0 ? pctChange(p.revenue, p.yesterdayRevenue) : null;
  const tile = "rounded-2xl border border-white/20 bg-white/[.13] px-3.5 py-3 sm:px-4 sm:py-3.5";
  return (
    <div className="grid max-w-[620px] flex-[1_1_480px] grid-cols-2 gap-2.5 sm:grid-cols-3">
      <div className={cn(tile, "col-span-2 sm:col-span-1")}>
        <p className="text-[11.5px] text-white/80">Pendapatan hari ini</p>
        <p className="mt-1 font-mono text-lg font-bold tabular-nums sm:text-[22px]">{rupiahShort(p.revenue)}</p>
        <p className="mt-1.5 flex items-center gap-1.5 text-[11.5px] text-white/75">
          {delta !== null ? (
            <span className={cn("rounded-full px-1.5 font-bold", delta >= 0 ? "bg-emerald-400/25 text-emerald-100" : "bg-rose-400/25 text-rose-100")}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>
          ) : null}
          {delta !== null ? "vs kemarin" : `Kemarin ${rupiahShort(p.yesterdayRevenue)}`}
        </p>
      </div>
      <div className={tile}>
        <p className="text-[11.5px] text-white/80">Transaksi</p>
        <p className="mt-1 font-mono text-lg font-bold tabular-nums sm:text-[22px]">
          {p.salesCount}
          {p.serviceCount > 0 && <span className="ml-1 text-[13px] font-medium text-white/75">+ {p.serviceCount} servis</span>}
        </p>
        <p className="mt-1.5 text-[11.5px] text-white/75">
          Rata-rata <span className="font-mono">{p.avgTicket > 0 ? rupiahShort(p.avgTicket) : "—"}</span>
        </p>
      </div>
      {can(role, "finance.view") ? (
        <div className={tile}>
          <p className="text-[11.5px] text-white/80">Laba kotor hari ini</p>
          <p className="mt-1 font-mono text-lg font-bold tabular-nums sm:text-[22px]">{rupiahShort(p.gross)}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.max(0, Math.min(100, p.margin))}%` }} />
          </div>
          <p className="mt-1 text-[11px] text-white/75">Margin {p.margin}%</p>
        </div>
      ) : null}
    </div>
  );
}

export function PulseSkeleton() {
  return (
    <div className="grid max-w-[620px] flex-[1_1_480px] grid-cols-2 gap-2.5 sm:grid-cols-3">
      {[0, 1, 2].map((i) => (
        <div key={i} className={cn("h-[92px] animate-pulse rounded-2xl bg-white/10 sm:h-[104px]", i === 0 && "col-span-2 sm:col-span-1")} />
      ))}
    </div>
  );
}

// ── B · Perlu tindakan ──────────────────────────────────────────────────────

export async function ActionSection({ tenantId, role, now }: Ctx) {
  const perms = {
    service: can(role, "service.manage"),
    reports: can(role, "reports.view"),
    inventory: can(role, "inventory.manage"),
    finance: can(role, "finance.view"),
  };
  const [counts, reports, reportSettings, lowReviews] = await Promise.all([
    getActionCounts(tenantId, now, perms).catch(() => null),
    perms.finance ? listDueReports(tenantId, now) : Promise.resolve([]),
    perms.finance ? getReportSettings(tenantId).catch(() => null) : Promise.resolve(null),
    perms.reports ? countOpenFollowUps(tenantId) : Promise.resolve(0),
  ]);
  if (!counts) return <SectionError what="Daftar tindakan" />;
  const rp = (n: number) => formatRupiah(n);
  const items: ActionItem[] = [];
  if (reports.length > 0)
    items.push({
      id: "reports",
      count: reports.length,
      title: "Laporan WA siap",
      detail: reports.map((r) => ({ DAILY: "Harian", WEEKLY: "Mingguan", MONTHLY: "Bulanan" })[r.kind]).join(" · "),
      cta: "Kirim laporan",
      tone: "primary",
    });
  if (counts.readyService > 0)
    items.push({
      id: "ready",
      count: counts.readyService,
      title: "Servis siap diambil",
      detail: counts.readyOldest ? `Tertua ${counts.readyOldest.days} hari · ${counts.readyOldest.number}` : "Kabari pelanggan",
      cta: "Kabari pelanggan",
      href: "/service?filter=ready",
      tone: "ok",
    });
  if (lowReviews > 0)
    items.push({
      id: "reviews",
      count: lowReviews,
      title: "Ulasan kurang puas",
      detail: "Hubungi & perbaiki segera",
      cta: "Tindak lanjuti",
      href: "/reviews?filter=tindak",
      tone: "bad",
    });
  if (counts.dueReminders > 0)
    items.push({
      id: "reminder",
      count: counts.dueReminders,
      title: "Pengingat servis",
      detail: "Jatuh tempo perawatan",
      cta: "Ingatkan via WA",
      href: "/service/reminders",
      tone: "warn",
    });
  if (counts.overdueCount > 0)
    items.push({
      id: "overdue",
      count: counts.overdueCount,
      title: "Piutang lewat tempo",
      detail: `${rp(counts.overdueAmount)} · ${counts.overdueDays} hari`,
      cta: "Tagih",
      href: "/receivables?filter=overdue",
      tone: "bad",
    });
  if (counts.stockOut > 0)
    items.push({
      id: "stock",
      count: counts.stockOut,
      title: "Stok habis",
      detail: counts.stockOutFirst ? `${counts.stockOutFirst}${counts.stockOut > 1 ? `, +${counts.stockOut - 1} lainnya` : ""}` : "Produk wajib stok",
      cta: "Buat pesanan",
      href: "/purchasing/reorder",
      tone: "bad",
    });
  if (counts.consignUnpaidCount > 0)
    items.push({
      id: "consign",
      count: counts.consignUnpaidCount,
      title: "Hak pemilik titipan",
      detail: `${rp(counts.consignUnpaidAmount)} belum dibayar`,
      cta: "Bayar",
      href: "/consignments?filter=owed",
      tone: "neutral",
    });
  return (
    <ActionCenter
      items={items}
      reports={reports}
      hasReportPhone={!!reportSettings?.phone}
      canConfigureReports={can(role, "settings.manage")}
    />
  );
}

// ── C · KPI bulan berjalan ──────────────────────────────────────────────────

function Delta({ cur, prev, invert = false }: { cur: number; prev: number; invert?: boolean }) {
  const d = pctChange(cur, prev);
  if (d === null) return <span className="text-muted-foreground">—</span>;
  const good = invert ? d <= 0 : d >= 0;
  return (
    <span className={cn("font-bold", good ? "text-success" : "text-destructive")}>
      {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
    </span>
  );
}

export async function MonthKpisSection({ tenantId, role }: Ctx) {
  if (!can(role, "finance.view")) return null;
  const k = await getMonthKpis(tenantId).catch(() => null);
  if (!k) return <SectionError what="Ringkasan bulan ini" />;
  const card = "rounded-2xl border bg-card p-4 elevate sm:p-[18px]";
  const eyebrow = "text-[10.5px] font-bold uppercase tracking-[.1em] text-muted-foreground";
  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold tracking-tight">
          {k.monthLabel}{" "}
          <span className="text-[13px] font-medium text-muted-foreground">
            · {k.label} vs {k.prevLabel}
          </span>
        </h2>
        <Link href="/finance" className="text-xs font-semibold text-primary hover:underline">
          Laporan keuangan →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className={card}>
          <p className={eyebrow}>Pendapatan</p>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl">{rupiahShort(k.revenue)}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Delta cur={k.revenue} prev={k.prevRevenue} />
            <span className="text-muted-foreground">vs {rupiahShort(k.prevRevenue)}</span>
          </p>
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="bg-primary" style={{ width: `${k.split.sales}%` }} />
            <div className="bg-amber-500" style={{ width: `${k.split.service}%` }} />
            <div className="bg-teal-500" style={{ width: `${k.split.build}%` }} />
          </div>
          <p className="mt-2 flex flex-wrap gap-x-2.5 text-[11px] text-muted-foreground">
            <span>Jual {k.split.sales}%</span>
            <span>Servis {k.split.service}%</span>
            <span>Rakit {k.split.build}%</span>
          </p>
        </div>
        <div className={card}>
          <p className={eyebrow}>Estimasi laba bersih</p>
          <p className={cn("mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl", k.net < 0 && "text-destructive")}>{rupiahShort(k.net)}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Delta cur={k.net} prev={k.prevNet} />
            <span className="text-muted-foreground">margin {k.netMargin.toLocaleString("id-ID")}%</span>
          </p>
          <dl className="mt-3 space-y-1 text-[11.5px]">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Laba kotor</dt>
              <dd className="font-mono tabular-nums">{rupiahShort(k.gross)}</dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Biaya operasional</dt>
              <dd className="font-mono tabular-nums">−{rupiahShort(k.expense)}</dd>
            </div>
          </dl>
        </div>
        <div className={card}>
          <p className={eyebrow}>Rata-rata transaksi</p>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl">{k.avgTicket > 0 ? rupiahShort(k.avgTicket) : "—"}</p>
          <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
            <Delta cur={k.avgTicket} prev={k.prevAvgTicket} />
            <span className="text-muted-foreground">{k.salesCount} transaksi</span>
          </p>
          <p className="mt-3 text-[11.5px] text-muted-foreground">
            Item per transaksi <b className="font-mono text-foreground">{k.itemsPerSale.toLocaleString("id-ID")}</b>
          </p>
        </div>
        <div className={card}>
          <p className={eyebrow}>Transaksi oleh member</p>
          <p className="mt-2 font-mono text-xl font-bold tabular-nums sm:text-2xl">{k.memberShare}%</p>
          <p className="mt-1 text-xs text-muted-foreground">
            <b className="text-success">+{k.newMembers}</b> pelanggan baru bulan ini
          </p>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full gradient-brand" style={{ width: `${k.memberShare}%` }} />
          </div>
        </div>
      </div>
    </section>
  );
}

// ── D · Performa + Tanya Arta ───────────────────────────────────────────────

const TONE_DOT: Record<string, string> = {
  critical: "bg-rose-400 ring-rose-400/20",
  warning: "bg-amber-300 ring-amber-300/20",
  info: "bg-violet-300 ring-violet-300/20",
  positive: "bg-emerald-300 ring-emerald-300/20",
};

export async function PerformanceSection({ tenantId, role }: Ctx) {
  if (!can(role, "reports.view")) return null;
  const [rows, insights] = await Promise.all([
    getPerformance(tenantId).catch(() => null),
    getArtaInsights(tenantId, role).catch(() => []),
  ]);
  const top = insights.slice(0, 4);
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
      {rows ? <PerformanceChart rows={rows} /> : <SectionError what="Grafik performa" />}
      <div className="relative overflow-hidden rounded-[20px] gradient-arta p-5 text-white elevate-lg">
        <span aria-hidden className="pointer-events-none absolute -right-12 -top-12 size-44 rounded-full bg-[#a855f7]/30 blur-3xl" />
        <div className="relative flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold">
            <Sparkles className="size-5 text-violet-300" /> Tanya Arta
          </h2>
          <Link href="/insights" className="text-xs font-semibold text-violet-200 hover:underline">
            Lihat semua
          </Link>
        </div>
        <p className="relative mt-1 text-[12.5px] text-white/70">Insight otomatis dari data toko Anda.</p>
        {top.length === 0 ? (
          <p className="relative mt-4 text-sm text-white/75">Belum ada insight baru — semuanya terlihat aman.</p>
        ) : (
          <ul className="relative mt-3 space-y-1">
            {top.map((it) => (
              <li key={it.id}>
                <Link href={it.href ?? "/insights"} className="flex gap-3 rounded-xl px-2.5 py-2.5 transition-colors hover:bg-white/[.07]">
                  <span className={cn("mt-1.5 size-2 shrink-0 rounded-full ring-4", TONE_DOT[it.tone] ?? TONE_DOT.info)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-semibold">{it.title}</span>
                    <span className="mt-0.5 block text-xs text-white/65">{it.detail}</span>
                  </span>
                  <ArrowRight className="mt-0.5 size-4 shrink-0 text-white/45" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// ── E · Operasional ─────────────────────────────────────────────────────────

const STATUS_CHIP: Record<string, { label: string; cls: string }> = {
  RECEIVED: { label: "Diterima", cls: "bg-muted text-muted-foreground" },
  IN_PROGRESS: { label: "Dikerjakan", cls: "bg-accent text-accent-foreground" },
  WAITING_PARTS: { label: "Tunggu part", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
};

const FEED_DOT: Record<ActivityKind, string> = {
  sale: "bg-primary",
  service: "bg-emerald-500",
  payment: "bg-amber-500",
  portal: "bg-teal-500",
  rma: "bg-muted-foreground",
};

export async function OperationsSection({ tenantId, role, now }: Ctx) {
  const canService = can(role, "service.manage");
  const canReports = can(role, "reports.view");
  if (!canService && !canReports) return null;
  const [pipe, top, feed] = await Promise.all([
    canService ? getServicePipeline(tenantId, now).catch(() => null) : null,
    canReports ? getTopSold(tenantId) : [],
    canReports
      ? getRecentActivity(tenantId, { service: canService, inventory: can(role, "inventory.manage") }).catch(() => [])
      : [],
  ]);
  const card = "rounded-2xl border bg-card p-5 elevate";
  const head = (title: string, href: string, link: string) => (
    <div className="mb-3 flex items-baseline justify-between gap-2">
      <h2 className="text-[15px] font-bold tracking-tight">{title}</h2>
      <Link href={href} className="text-xs font-semibold text-primary hover:underline">
        {link} →
      </Link>
    </div>
  );
  const maxTop = Math.max(1, ...top.map((t) => t.qty));
  return (
    <section className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)_minmax(0,1fr)]">
      {pipe && (
        <div className={cn(card, "lg:col-span-2 xl:col-span-1")}>
          {head("Alur servis", "/service", "Semua tiket")}
          <div className="grid grid-cols-4 gap-2">
            {[
              { l: "Diterima", n: pipe.received, c: "bg-muted", t: "text-muted-foreground", f: "active" },
              { l: "Dikerjakan", n: pipe.progress, c: "bg-accent", t: "text-accent-foreground", f: "active" },
              { l: "Tunggu part", n: pipe.waiting, c: "bg-amber-500/15", t: "text-amber-700 dark:text-amber-400", f: "active" },
              { l: "Siap diambil", n: pipe.ready, c: "bg-emerald-500/12", t: "text-emerald-700 dark:text-emerald-400", f: "ready" },
            ].map((s) => (
              <Link key={s.l} href={`/service?filter=${s.f}`} className={cn("rounded-xl px-2.5 py-2.5 transition hover:brightness-95", s.c)}>
                <p className={cn("truncate text-[11px] sm:text-[11.5px]", s.t)}>{s.l}</p>
                <p className="mt-0.5 font-mono text-xl font-bold tabular-nums">{s.n}</p>
              </Link>
            ))}
          </div>
          {pipe.oldest.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada tiket aktif.</p>
          ) : (
            <ul className="mt-2 divide-y">
              {pipe.oldest.map((t) => {
                const late = t.days > 3;
                const chip = STATUS_CHIP[t.status];
                return (
                  <li key={t.id}>
                    <Link href={`/service/${t.id}`} className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-2.5 hover:bg-accent/40">
                      <span className="w-[74px] shrink-0 font-mono text-xs text-muted-foreground">{t.number}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-semibold">{t.device || "Perangkat"}</span>
                        <span className="block truncate text-[11.5px] text-muted-foreground">
                          {t.customer} · {t.note}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold",
                          late ? "bg-rose-500/12 text-rose-600 dark:text-rose-400" : chip?.cls,
                        )}
                      >
                        {t.days} hari{late ? " · SLA" : ""}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {canReports && (
        <div className={card}>
          {head("Terlaris 7 hari", "/reports", "Laporan")}
          {top.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada penjualan 7 hari terakhir.</p>
          ) : (
            <ol className="space-y-3">
              {top.map((t, i) => (
                <li key={t.name}>
                  <div className="flex justify-between gap-2 text-[12.5px]">
                    <span className="min-w-0 truncate">
                      <span className="mr-1.5 font-mono text-muted-foreground">{i + 1}</span>
                      {t.name}
                    </span>
                    <span className="font-mono font-semibold tabular-nums">{t.qty}×</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full gradient-brand" style={{ width: `${(t.qty / maxTop) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      {canReports && (
        <div className={card}>
          {head("Aktivitas terbaru", "/sales", "Riwayat")}
          {feed.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Belum ada aktivitas.</p>
          ) : (
            <ul>
              {feed.map((f, i) => (
                <li key={`${f.kind}-${f.at}-${i}`}>
                  <Link href={f.href} className="-mx-2 flex gap-3 rounded-lg px-2 py-2 hover:bg-accent/40">
                    <span className="flex flex-col items-center">
                      <span className={cn("mt-1.5 size-2 rounded-full", FEED_DOT[f.kind])} />
                      {i < feed.length - 1 && <span className="mt-1 w-px flex-1 bg-border" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2 text-[12.5px]">
                        <b className="truncate font-semibold">{f.title}</b>
                        <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                          {formatLocalDateTime(f.at, { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </span>
                      <span className="block truncate text-[11.5px] text-muted-foreground">{f.detail}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// ── Kerangka (skeleton) ─────────────────────────────────────────────────────

export function BlockSkeleton({ h = "h-40", cols = 1 }: { h?: string; cols?: number }) {
  return (
    <div className={cn("grid gap-3", cols === 4 ? "grid-cols-2 xl:grid-cols-4" : cols === 2 ? "lg:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]" : cols === 3 ? "lg:grid-cols-3" : "")}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className={cn("animate-pulse rounded-2xl border bg-card", h)} />
      ))}
    </div>
  );
}
