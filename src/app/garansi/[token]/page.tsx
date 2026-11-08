import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, CalendarClock, Hash, Images, MessageCircle, PackageOpen, Receipt, ShieldCheck, Store, Wrench } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { getPublicWarranty } from "@/server/warranty/service";
import { storeOgImageUrl } from "@/server/public/track-info";
import { WARRANTY_STATUS_PUBLIC, periodText, remainingText, warrantyProgress } from "@/lib/warranty-card";
import { shortName } from "@/lib/review";
import { waLink } from "@/lib/whatsapp";
import { formatLocalDate, daysFromNow } from "@/lib/timezone";
import { cn } from "@/lib/utils";
import { APP_NAME } from "@/lib/brand";
import { rmaPublicStatusLabel } from "@/app/(dashboard)/rma/status-config";
import { WarrantyBeacon } from "./warranty-beacon";

type Params = Promise<{ token: string }>;

/** Link pribadi: jangan diindeks & jangan bocorkan token lewat Referer. */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { token } = await params;
  const w = await getPublicWarranty(token);
  const base: Metadata = { robots: { index: false, follow: false }, referrer: "no-referrer" };
  if (!w) return { ...base, title: "Kartu Garansi" };
  const title = `Kartu Garansi — ${w.productName}`;
  const description = `Garansi resmi ${w.tenant.name}. Cek masa garansi & ajukan klaim.`;
  return {
    ...base,
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: w.tenant.name,
      type: "website",
      locale: "id_ID",
      images: [{ url: storeOgImageUrl(w.tenant.slug, w.tenant.updatedAt), width: 1200, height: 630 }],
    },
  };
}

const D = (d: Date) => formatLocalDate(d, { day: "numeric", month: "long", year: "numeric" });

const TONE = {
  ok: "from-emerald-600 to-emerald-800",
  muted: "from-zinc-600 to-zinc-800",
  info: "from-sky-600 to-sky-800",
  bad: "from-rose-600 to-rose-800",
} as const;

export default async function WarrantyCardPage({ params }: { params: Params }) {
  const { token } = await params;
  const w = await getPublicWarranty(token);
  if (!w) notFound();
  const now = daysFromNow(0);
  const st = WARRANTY_STATUS_PUBLIC[w.display.status];
  const prog = w.display.status === "ACTIVE" ? warrantyProgress(w.soldAt, w.warrantyUntil, now) : null;
  const claimMsg = `Halo ${w.tenant.name}, saya ingin klaim/tanya garansi:\n• ${w.productName}\n• SN: ${w.serialNumber}${
    w.saleNumber ? `\n• Invoice: ${w.saleNumber}` : ""
  }\nKeluhan: `;

  return (
    <div className="min-h-screen bg-muted/30">
      <WarrantyBeacon token={token} />
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          {w.tenant.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={w.tenant.logo} alt={w.tenant.name} className="h-10 w-auto max-w-24 rounded-lg bg-white object-contain" />
          ) : (
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Store className="size-5" />
            </div>
          )}
          <div className="leading-tight">
            <p className="font-semibold">{w.tenant.name}</p>
            <p className="text-xs text-muted-foreground">Kartu Garansi Digital</p>
          </div>
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto max-w-md space-y-4 px-4 py-6">
        {/* Kartu utama */}
        <div className={cn("relative overflow-hidden rounded-3xl bg-gradient-to-br p-6 text-white shadow-xl", TONE[st.tone])}>
          <div className="absolute -right-10 -top-10 size-44 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-2 text-sm font-semibold uppercase tracking-wider">
            <ShieldCheck className="size-5" /> {st.label}
          </div>
          <h1 className="relative mt-3 text-2xl font-bold leading-tight">{w.productName}</h1>
          <p className="relative mt-1 font-mono text-sm opacity-90">SN: {w.serialNumber}</p>
          {prog && (
            <div className="relative mt-5">
              <div className="flex items-end justify-between text-sm">
                <span className="opacity-85">Sisa masa garansi</span>
                <b className="text-lg">{remainingText(prog.daysLeft)}</b>
              </div>
              <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/25">
                <div className="h-full rounded-full bg-white" style={{ width: `${prog.remainingPct}%` }} />
              </div>
            </div>
          )}
          {w.display.status === "ACTIVE" && !w.warrantyUntil && (
            <p className="relative mt-4 text-sm opacity-90">Garansi tanpa batas waktu tercatat.</p>
          )}
          <p className="relative mt-5 flex items-center gap-1.5 text-xs opacity-85">
            <BadgeCheck className="size-4" /> Terverifikasi langsung dari sistem {w.tenant.name}
          </p>
        </div>

        {/* Rincian */}
        <div className="divide-y rounded-2xl border bg-card text-sm">
          <Row icon={CalendarClock} label="Tanggal pembelian" value={D(w.soldAt)} />
          <Row icon={ShieldCheck} label="Masa garansi" value={periodText(w.warrantyMonths)} />
          {w.warrantyUntil && <Row icon={CalendarClock} label="Berlaku sampai" value={D(w.warrantyUntil)} strong />}
          {w.saleNumber && <Row icon={Receipt} label="No. invoice" value={w.saleNumber} mono />}
          {w.customerName && <Row icon={Hash} label="Atas nama" value={shortName(w.customerName)} />}
        </div>

        {/* Klaim ke distributor (RMA) */}
        {w.rmaClaims.length > 0 && (
          <div className="rounded-2xl border bg-card p-4 text-sm">
            <p className="flex items-center gap-2 font-semibold">
              <PackageOpen className="size-4 text-primary" /> Riwayat klaim garansi
            </p>
            <ul className="mt-2 space-y-2">
              {w.rmaClaims.map((c) => (
                <li key={c.number} className="rounded-lg bg-muted/60 p-3">
                  <p className="font-medium">{rmaPublicStatusLabel(c.status, c.resolution)}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.number} · dikirim {formatLocalDate(c.sentAt, { day: "numeric", month: "short", year: "numeric" })}
                    {c.replacementSn ? ` · SN pengganti ${c.replacementSn}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Aksi */}
        <div className="flex flex-col gap-2">
          {w.tenant.phone && (
            <a
              href={waLink(claimMsg, w.tenant.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white hover:opacity-90"
            >
              <MessageCircle className="size-5" /> {w.display.status === "ACTIVE" ? "Ajukan klaim / tanya garansi" : "Hubungi toko via WhatsApp"}
            </a>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={`/lacak?t=${encodeURIComponent(w.tenant.slug)}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card text-sm font-medium hover:bg-accent"
            >
              <Wrench className="size-4" /> Lacak servis
            </Link>
            <Link
              href={`/galeri/${w.tenant.slug}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border bg-card text-sm font-medium hover:bg-accent"
            >
              <Images className="size-4" /> Produk & promo
            </Link>
          </div>
        </div>

        <p className="pt-2 text-center text-xs leading-relaxed text-muted-foreground">
          Simpan link/QR ini sebagai bukti garansi pengganti nota.
          <br />
          {w.tenant.name}
          {w.tenant.address ? ` · ${w.tenant.address.split("\n")[0]}` : ""} · ditenagai {APP_NAME}
        </p>
      </main>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  strong,
  mono,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <span className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" /> {label}
      </span>
      <span className={cn("text-right", strong && "font-semibold", mono && "font-mono")}>{value}</span>
    </div>
  );
}
