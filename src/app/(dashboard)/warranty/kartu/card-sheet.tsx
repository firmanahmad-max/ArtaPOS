"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Copy, CreditCard, ExternalLink, MessageCircle, Printer, Sticker } from "lucide-react";
import { QrCode } from "@/components/barcode/qr-code";
import { buildWarrantyUrl, periodText } from "@/lib/warranty-card";
import { buildWarrantyCardText, waLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface Unit {
  id: string;
  token: string;
  productName: string;
  serialNumber: string;
  customerName: string | null;
  customerPhone: string | null;
  saleNumber: string | null;
  soldText: string;
  untilText: string | null;
  periodMonths: number;
  status: "ACTIVE" | "EXPIRED" | "CLAIMED" | "VOID";
  cardViews: number;
}

const STATUS = {
  ACTIVE: { label: "Aktif", variant: "success" },
  EXPIRED: { label: "Kedaluwarsa", variant: "destructive" },
  CLAIMED: { label: "Diklaim", variant: "default" },
  VOID: { label: "Batal", variant: "muted" },
} as const;

/**
 * Lembar cetak kartu garansi (85,6×54 mm, ukuran kartu ATM) atau stiker QR
 * (50×30 mm) + kirim kartu digital via WhatsApp. URL dibangun dari origin klien.
 */
export function WarrantyCardSheet({
  units,
  store,
  origin,
}: {
  units: Unit[];
  store: { name: string; logo: string | null; phone: string | null };
  /** Origin situs (dari header request) — dipakai saat render, jadi tak boleh dari window. */
  origin: string;
}) {
  const [layout, setLayout] = useState<"card" | "sticker">("card");
  const [copies, setCopies] = useState(1);
  const url = (u: Unit) => buildWarrantyUrl(origin, u.token);
  const customer = units.find((u) => u.customerPhone) ?? units[0];
  const sameCustomer = units.every((u) => u.customerName === units[0].customerName);

  function sendWa(list: Unit[]) {
    const text = buildWarrantyCardText({
      storeName: store.name,
      customerName: list[0].customerName,
      units: list.map((u) => ({ productName: u.productName, serialNumber: u.serialNumber, untilText: u.untilText, url: url(u) })),
    });
    window.open(waLink(text, list[0].customerPhone ?? undefined), "_blank", "noopener,noreferrer");
  }

  return (
    <div className="space-y-6">
      <style>{`@media print {
        @page { margin: 8mm; }
        body * { visibility: hidden !important; }
        #printable, #printable * { visibility: visible !important; }
        #printable { position: absolute; left: 0; top: 0; }
        .no-print { display: none !important; }
      }`}</style>

      {/* Kontrol */}
      <Card className="no-print space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg bg-muted p-0.5">
            {(
              [
                ["card", "Kartu 85×54 mm", CreditCard],
                ["sticker", "Stiker 50×30 mm", Sticker],
              ] as const
            ).map(([k, label, Icon]) => (
              <button
                key={k}
                type="button"
                onClick={() => setLayout(k)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-semibold",
                  layout === k ? "bg-card shadow-sm" : "text-muted-foreground",
                )}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            Salinan per unit
            <input
              type="number"
              min={1}
              max={20}
              value={copies}
              onChange={(e) => setCopies(Math.min(20, Math.max(1, Math.trunc(Number(e.target.value)) || 1)))}
              className="h-8 w-16 rounded-md border bg-background px-2 text-center"
            />
          </label>
          <Button onClick={() => window.print()} className="ml-auto">
            <Printer /> Cetak
          </Button>
        </div>
        {units.length > 1 && sameCustomer && (
          <Button variant="whatsapp" onClick={() => sendWa(units)}>
            <MessageCircle /> Kirim semua ({units.length}) kartu ke {customer.customerName ?? "pelanggan"} via WhatsApp
          </Button>
        )}
        <div className="divide-y rounded-lg border">
          {units.map((u) => (
            <div key={u.id} className="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
              <div className="min-w-0">
                <p className="font-medium">{u.productName}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{u.serialNumber}</span> · {u.customerName ?? "Umum"}
                  {u.untilText ? ` · s/d ${u.untilText}` : ""} · dibuka {u.cardViews}×
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <Badge variant={STATUS[u.status].variant}>{STATUS[u.status].label}</Badge>
                <Button size="sm" variant="whatsapp" onClick={() => sendWa([u])}>
                  <MessageCircle className="size-3.5" /> WA
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    navigator.clipboard?.writeText(url(u)).then(
                      () => toast.success("Link kartu garansi disalin."),
                      () => toast.error("Gagal menyalin."),
                    )
                  }
                >
                  <Copy className="size-3.5" /> Salin link
                </Button>
                <a
                  href={`/garansi/${u.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-8 items-center gap-1 rounded-md border px-2.5 text-xs font-medium hover:bg-accent"
                >
                  <ExternalLink className="size-3.5" /> Buka
                </a>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Area cetak */}
      <div id="printable" className="flex flex-wrap gap-[4mm] bg-white p-[2mm] text-black">
        {units.flatMap((u) =>
          Array.from({ length: copies }, (_, i) =>
            layout === "card" ? (
              <WarrantyCard key={`${u.id}-${i}`} unit={u} store={store} url={url(u)} />
            ) : (
              <WarrantySticker key={`${u.id}-${i}`} unit={u} store={store} url={url(u)} />
            ),
          ),
        )}
      </div>
    </div>
  );
}

function WarrantyCard({
  unit: u,
  store,
  url,
}: {
  unit: Unit;
  store: { name: string; logo: string | null; phone: string | null };
  url: string;
}) {
  return (
    <div
      className="relative flex overflow-hidden rounded-[3mm] border border-black/20 bg-white"
      style={{ width: "85.6mm", height: "54mm", breakInside: "avoid" }}
    >
      <div className="absolute inset-x-0 top-0 h-[2mm] bg-gradient-to-r from-violet-700 to-fuchsia-600" />
      <div className="flex min-w-0 flex-1 flex-col p-[3.5mm] pt-[4.5mm]">
        <div className="flex items-center gap-[2mm]">
          {store.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={store.logo} alt="" style={{ height: "7mm", maxWidth: "16mm", objectFit: "contain" }} />
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[8pt] font-bold">{store.name}</p>
            <p className="text-[5.5pt] font-semibold uppercase tracking-[0.15em] text-violet-700">Kartu Garansi Resmi</p>
          </div>
        </div>
        <p className="mt-[2.5mm] line-clamp-2 text-[8.5pt] font-bold leading-tight">{u.productName}</p>
        <p className="mt-[1mm] font-mono text-[6.5pt]">SN: {u.serialNumber}</p>
        <div className="mt-auto grid grid-cols-2 gap-x-[2mm] text-[5.8pt] leading-tight">
          <span className="text-black/55">Tgl beli</span>
          <span className="text-black/55">Garansi</span>
          <b>{u.soldText}</b>
          <b>{u.untilText ? `s/d ${u.untilText}` : periodText(u.periodMonths)}</b>
        </div>
        {store.phone && <p className="mt-[1mm] text-[5.5pt] text-black/60">Klaim/info: WA {store.phone}</p>}
      </div>
      <div className="flex w-[28mm] shrink-0 flex-col items-center justify-center gap-[1mm] border-l border-dashed border-black/15 p-[2mm]">
        <QrCode value={url} size={86} />
        <p className="text-center text-[5.3pt] font-semibold leading-tight">Scan untuk cek garansi &amp; klaim</p>
      </div>
    </div>
  );
}

function WarrantySticker({ unit: u, store, url }: { unit: Unit; store: { name: string }; url: string }) {
  return (
    <div
      className="flex items-center gap-[2mm] overflow-hidden rounded-[1.5mm] border border-black/30 bg-white p-[1.8mm]"
      style={{ width: "50mm", height: "30mm", breakInside: "avoid" }}
    >
      <QrCode value={url} size={88} />
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[6.5pt] font-bold">{store.name}</p>
        <p className="text-[5.5pt] font-semibold uppercase tracking-wider text-violet-700">Garansi</p>
        <p className="mt-[0.8mm] text-[7pt] font-bold">{u.untilText ? `s/d ${u.untilText}` : periodText(u.periodMonths)}</p>
        <p className="mt-[0.8mm] break-all font-mono text-[5.5pt]">{u.serialNumber}</p>
        <p className="mt-[0.8mm] text-[5pt] text-black/60">Scan untuk cek &amp; klaim</p>
      </div>
    </div>
  );
}
