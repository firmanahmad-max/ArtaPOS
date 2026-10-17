"use client";

import { useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import Link from "next/link";
import { BellRing, ChevronDown, Images, Star, UserRound } from "lucide-react";
import { loadAssetsAction, loadProgramsAction } from "@/server/dashboard/actions";
import type { AssetsData, ProgramsData } from "@/server/dashboard/service";
import { rupiahShort } from "@/lib/dashboard-calc";
import { cn, formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

// ── Status lipat per perangkat (localStorage) ───────────────────────────────

const listeners = new Set<() => void>();
const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
};
const foldKey = (id: string) => `artapos-dash-fold:${id}`;

function useFold(id: string, defaultOpen: boolean): [boolean, () => void] {
  const open = useSyncExternalStore(
    subscribe,
    () => {
      try {
        const v = localStorage.getItem(foldKey(id));
        return v === null ? defaultOpen : v === "1";
      } catch {
        return defaultOpen;
      }
    },
    () => defaultOpen,
  );
  const toggle = () => {
    try {
      localStorage.setItem(foldKey(id), open ? "0" : "1");
    } catch {
      /* abaikan */
    }
    listeners.forEach((l) => l());
  };
  return [open, toggle];
}

/** Data dimuat sekali saat bagian PERTAMA KALI dibuka (bagian terlipat = nol query). */
function useLazyData<T>(open: boolean, load: () => Promise<{ ok: boolean; data?: T; message?: string }>) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: false });
  const [requested, setRequested] = useState(false);
  if (open && !requested) {
    setRequested(true);
    setState({ loading: true });
  }
  useEffect(() => {
    if (!requested) return;
    let alive = true;
    load().then(
      (r) => alive && setState(r.ok ? { data: r.data, loading: false } : { error: r.message, loading: false }),
      () => alive && setState({ error: "Gagal memuat.", loading: false }),
    );
    return () => {
      alive = false;
    };
  }, [requested, load]);
  return state;
}

function FoldShell({
  title,
  subtitle,
  open,
  onToggle,
  summary,
  children,
}: {
  title: string;
  subtitle?: string;
  open: boolean;
  onToggle: () => void;
  summary: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[15px] font-bold tracking-tight">
          {title} {subtitle && <span className="text-xs font-normal text-muted-foreground">· {subtitle}</span>}
        </h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          className="inline-flex h-8 items-center gap-1.5 rounded-lg border bg-card px-3 text-xs font-semibold transition-colors hover:bg-accent"
        >
          {open ? "Lipat" : "Buka"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </button>
      </div>
      {open ? (
        children
      ) : (
        <button
          type="button"
          onClick={onToggle}
          className="flex w-full flex-wrap items-center gap-x-5 gap-y-1 rounded-2xl border bg-card px-4 py-3 text-left text-[12.5px] text-muted-foreground elevate transition-colors hover:bg-accent/40"
        >
          {summary}
        </button>
      )}
    </section>
  );
}

const Num = ({ children, className }: { children: ReactNode; className?: string }) => (
  <b className={cn("font-mono font-semibold text-foreground tabular-nums", className)}>{children}</b>
);

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="h-44 animate-pulse rounded-2xl border bg-card" />
      ))}
    </div>
  );
}

// ── F · Pelanggan & program ─────────────────────────────────────────────────

export function ProgramsSection() {
  const [open, toggle] = useFold("programs", true);
  const { data, error, loading } = useLazyData<ProgramsData>(open, loadProgramsAction);

  const summary = data ? (
    <>
      <span>Poin beredar <Num>{data.loyalty.points.toLocaleString("id-ID")}</Num></span>
      {data.portal && <span>Portal dibuka <Num>{data.portal.openRate}%</Num></span>}
      {data.reminders && <span>Kembali servis <Num>{data.reminders.returned}</Num></span>}
      {data.links && <span>Kunjungan tautan WA <Num>{data.links.lacak + data.links.fromReceipt + data.links.fromLacak + data.links.fromConsignment}</Num></span>}
    </>
  ) : (
    <span>Program poin · Portal member · Pengingat servis · Tautan WA &amp; galeri — ketuk untuk membuka</span>
  );

  return (
    <FoldShell title="Pelanggan & program" subtitle="30 hari terakhir" open={open} onToggle={toggle} summary={summary}>
      {loading || (!data && !error) ? (
        <LoadingGrid />
      ) : error || !data ? (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">{error ?? "Gagal memuat."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-4">
          <Card href="/customers" icon={<Star className="size-5" />} tone="bg-amber-500/15 text-amber-600 dark:text-amber-400" title="Program Poin" sub={data.loyalty.active ? `Cashback ${data.loyalty.cashback.toLocaleString("id-ID")}%` : "Belum aktif"}>
            <p className="font-mono text-[22px] font-bold tabular-nums">
              {data.loyalty.points.toLocaleString("id-ID")} <span className="text-xs font-medium text-muted-foreground">poin beredar</span>
            </p>
            <p className="text-xs text-muted-foreground">Kewajiban potongan <Num>{formatRupiah(data.loyalty.worth)}</Num></p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-[11.5px]">
              <Mini label="Siap tukar" value={`${data.loyalty.ready} member`} />
              <Mini label="Ditukar 30 hr" value={data.loyalty.redeemed30.toLocaleString("id-ID")} />
            </div>
          </Card>

          {data.portal && (
            <Card href="/customers" icon={<UserRound className="size-5" />} tone="bg-accent text-primary" title="Portal Member" sub="Link pribadi pelanggan">
              <div className="flex items-center gap-3.5">
                <Ring pct={data.portal.openRate} />
                <div>
                  <p className="font-mono text-[22px] font-bold tabular-nums">{data.portal.openRate}%</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {data.portal.opened} dari {data.portal.linked} link pernah dibuka
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1.5 text-[11.5px]">
                {(
                  [
                    ["Struk", data.portal.byChannel.receipt],
                    ["Nota servis", data.portal.byChannel.service],
                    ["Pengingat", data.portal.byChannel.reminder],
                    ["Undangan", data.portal.byChannel.invite],
                    ["Langsung", data.portal.byChannel.direct],
                  ] as const
                )
                  .filter(([, n]) => n > 0)
                  .map(([l, n]) => (
                    <ChannelBar key={l} label={l} n={n} max={Math.max(1, ...Object.values(data.portal!.byChannel))} />
                  ))}
                {data.portal.visits === 0 && <p className="text-muted-foreground">Belum ada kunjungan 30 hari.</p>}
              </div>
            </Card>
          )}

          {data.reminders && (
            <Card href="/service/reminders" icon={<BellRing className="size-5" />} tone="bg-emerald-500/12 text-emerald-600 dark:text-emerald-400" title="Pengingat Servis" sub="Perawatan berkala">
              {data.reminders.hasCatalog ? (
                <>
                  <div className="flex items-end gap-1.5">
                    <Col value={data.reminders.due} label="Jatuh tempo" className="bg-amber-500/20" max={Math.max(1, data.reminders.due, data.reminders.reminded, data.reminders.returned)} />
                    <Col value={data.reminders.reminded} label="Diingatkan" className="bg-accent" max={Math.max(1, data.reminders.due, data.reminders.reminded, data.reminders.returned)} />
                    <Col value={data.reminders.returned} label="Kembali" className="bg-success" max={Math.max(1, data.reminders.due, data.reminders.reminded, data.reminders.returned)} />
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Konversi pengingat{" "}
                    <Num className="text-success">{data.reminders.conversion === null ? "—" : `${data.reminders.conversion}%`}</Num>
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground">Atur jasa berkala di Katalog Jasa untuk mulai mengingatkan pelanggan.</p>
              )}
            </Card>
          )}

          {data.links && (
            <Card href="/gallery" icon={<Images className="size-5" />} tone="bg-teal-500/12 text-teal-600 dark:text-teal-400" title="Tautan WA & Galeri" sub="Kunjungan dari pesan toko">
              <dl className="space-y-2 text-[12.5px]">
                <Row label="Lacak servis dibuka" value={data.links.lacak} />
                <Row label="Galeri dari struk" value={data.links.fromReceipt} />
                <Row label="Galeri dari lacak" value={data.links.fromLacak} />
                <Row label="Klik Chat WA galeri (total)" value={data.links.galleryClicks} accent />
              </dl>
            </Card>
          )}
        </div>
      )}
    </FoldShell>
  );
}

// ── G · Aset & inventaris ───────────────────────────────────────────────────

export function AssetsSection() {
  const [open, toggle] = useFold("assets", false);
  const { data, error, loading } = useLazyData<AssetsData>(open, loadAssetsAction);

  const summary = data ? (
    <>
      <span>Stok habis <Num className="text-destructive">{data.outCount}</Num></span>
      <span>Barang bekas <Num>{data.used.count} · {rupiahShort(data.used.capital)}</Num></span>
      <span>Hak titipan <Num>{rupiahShort(data.consign.unpaid)}</Num></span>
      <span>Garansi aktif <Num>{data.warranty.active}</Num></span>
    </>
  ) : (
    <span>Stok kritis · Barang bekas · Titip jual · Garansi &amp; RMA — ketuk untuk membuka</span>
  );

  return (
    <FoldShell title="Aset & inventaris" open={open} onToggle={toggle} summary={summary}>
      {loading || (!data && !error) ? (
        <LoadingGrid />
      ) : error || !data ? (
        <p className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">{error ?? "Gagal memuat."}</p>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <div className="rounded-2xl border bg-card p-4 elevate sm:col-span-2 xl:col-span-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[13.5px] font-bold">Stok kritis</p>
              <span className="text-[11.5px] text-muted-foreground">
                {data.productCount} produk · {data.coverage}% tersedia
              </span>
            </div>
            {data.critical.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">Semua stok di atas batas minimum.</p>
            ) : (
              <ul className="mt-1.5 divide-y text-[12.5px]">
                {data.critical.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 py-2">
                    <span className="min-w-0 flex-1 truncate">{p.name}</span>
                    <span className={cn("font-mono font-bold tabular-nums", p.stock <= 0 ? "text-destructive" : "text-amber-600 dark:text-amber-400")}>{p.stock}</span>
                    <span className="font-mono text-[11px] text-muted-foreground">/ min {p.minStock}</span>
                  </li>
                ))}
              </ul>
            )}
            {data.critical.length > 0 && (
              <Link href="/purchasing/reorder" className={cn(buttonVariants({ size: "sm" }), "mt-2 w-full")}>
                Buat pesanan pembelian
              </Link>
            )}
          </div>
          <StatList
            href="/used-items"
            title="Barang Bekas"
            value={data.used.count}
            unit="tersedia"
            rows={[
              ["Modal tertanam", rupiahShort(data.used.capital)],
              ["Potensi laba", rupiahShort(data.used.potential), "ok"],
              ["Lama >60 hari", String(data.used.stale), data.used.stale > 0 ? "warn" : undefined],
            ]}
          />
          <StatList
            href="/consignments"
            title="Titip Jual"
            value={data.consign.available}
            unit="dititipkan"
            rows={[
              ["Laku bulan ini", String(data.consign.soldThisMonth)],
              ["Komisi toko", rupiahShort(data.consign.commission), "ok"],
              ["Hak belum dibayar", rupiahShort(data.consign.unpaid), data.consign.unpaid > 0 ? "bad" : undefined],
            ]}
          />
          <StatList
            href="/warranty"
            title="Garansi & RMA"
            value={data.warranty.active}
            unit="garansi aktif"
            rows={[
              ["Habis ≤30 hari", String(data.warranty.expiring), data.warranty.expiring > 0 ? "warn" : undefined],
              ["Klaim di distributor", String(data.warranty.rmaOpen)],
              ["Rata-rata proses RMA", data.warranty.rmaDays === null ? "—" : `${data.warranty.rmaDays} hari`],
            ]}
          />
        </div>
      )}
    </FoldShell>
  );
}

// ── Bagian kecil ────────────────────────────────────────────────────────────

function Card({
  href,
  icon,
  tone,
  title,
  sub,
  children,
}: {
  href: string;
  icon: ReactNode;
  tone: string;
  title: string;
  sub: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 elevate">
      <Link href={href} className="group flex items-center gap-2.5">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tone)}>{icon}</span>
        <span className="min-w-0">
          <span className="block text-[13.5px] font-bold group-hover:underline">{title}</span>
          <span className="block text-[11.5px] text-muted-foreground">{sub}</span>
        </span>
      </Link>
      <div>{children}</div>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted px-2.5 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-mono text-[15px] font-bold tabular-nums">{value}</p>
    </div>
  );
}

function Ring({ pct }: { pct: number }) {
  const c = 2 * Math.PI * 15;
  return (
    <svg viewBox="0 0 36 36" className="size-14 shrink-0" role="img" aria-label={`${pct}% link pernah dibuka`}>
      <circle cx="18" cy="18" r="15" fill="none" className="stroke-muted" strokeWidth="5" />
      <circle
        cx="18"
        cy="18"
        r="15"
        fill="none"
        className="stroke-primary"
        strokeWidth="5"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        transform="rotate(-90 18 18)"
      />
    </svg>
  );
}

function ChannelBar({ label, n, max }: { label: string; n: number; max: number }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[74px] text-muted-foreground">{label}</span>
      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
        <span className="block h-full rounded-full bg-primary" style={{ width: `${(n / max) * 100}%` }} />
      </span>
      <span className="font-mono tabular-nums">{n}</span>
    </div>
  );
}

function Col({ value, label, className, max }: { value: number; label: string; className: string; max: number }) {
  return (
    <div className="flex-1 text-center">
      <div className="flex h-14 items-end">
        <div className={cn("w-full rounded-t-lg", className)} style={{ height: `${Math.max(8, (value / max) * 100)}%` }} />
      </div>
      <p className="mt-1 font-mono text-[15px] font-bold tabular-nums">{value}</p>
      <p className="text-[10.5px] text-muted-foreground">{label}</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn("font-mono font-bold tabular-nums", accent && "text-success")}>{value.toLocaleString("id-ID")}</dd>
    </div>
  );
}

function StatList({
  href,
  title,
  value,
  unit,
  rows,
}: {
  href: string;
  title: string;
  value: number;
  unit: string;
  rows: [string, string, ("ok" | "warn" | "bad")?][];
}) {
  const tone = { ok: "text-success", warn: "text-amber-600 dark:text-amber-400", bad: "text-destructive" } as const;
  return (
    <Link href={href} className="flex flex-col gap-2.5 rounded-2xl border bg-card p-4 elevate transition-colors hover:bg-accent/30">
      <p className="text-[13.5px] font-bold">{title}</p>
      <p className="font-mono text-[22px] font-bold tabular-nums">
        {value.toLocaleString("id-ID")} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
      </p>
      <dl className="space-y-1.5 text-xs">
        {rows.map(([l, v, t]) => (
          <div key={l} className="flex justify-between gap-2">
            <dt className="text-muted-foreground">{l}</dt>
            <dd className={cn("font-mono font-semibold tabular-nums", t && tone[t])}>{v}</dd>
          </div>
        ))}
      </dl>
    </Link>
  );
}

