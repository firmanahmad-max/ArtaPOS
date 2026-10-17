"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Save, HandCoins, MessageCircle } from "lucide-react";
import type { ServiceStatus } from "@/generated/prisma/enums";
import {
  addPartAction,
  addLineAction,
  removeItemAction,
  updateLaborAction,
  updateServiceDiscountAction,
  updateAccessoriesAction,
  updateStatusAction,
  updateStatusNoteAction,
  recordServicePaymentAction,
} from "@/server/service-jobs/actions";
import { clampQty, formatRupiah } from "@/lib/utils";
import { formatLocalDateTime } from "@/lib/timezone";
import { buildServiceStatusText, waLink } from "@/lib/whatsapp";
import { buildTrackUrl, type TrackExtras } from "@/lib/track-link";
import { JobPointsPanel, type JobLoyaltyInfo } from "@/components/loyalty/job-points-panel";
import { intervalText } from "@/lib/service-reminder";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartPicker } from "@/components/inventory/part-picker";
import { SERVICE_STATUS_META, SERVICE_FLOW, STATUS_NOTE_SUGGESTIONS } from "./status-config";

const METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  TRANSFER: "Transfer",
  QRIS: "QRIS",
  CREDIT: "Kredit/Tempo",
};

export interface TicketItem {
  id: string;
  name: string;
  qty: number;
  price: number;
  subtotal: number;
  isPart: boolean;
}
export interface TicketData {
  id: string;
  status: ServiceStatus;
  statusNote: string | null;
  statusNoteAt: string | null;
  accessories: string | null;
  laborCost: number;
  partsCost: number;
  discount: number;
  total: number;
  paid: number;
  paymentMethod: string | null;
  items: TicketItem[];
}
export interface ServiceProduct {
  id: string;
  name: string;
  sellPrice: number;
  stock: number;
}

export function TicketDetail({
  ticket,
  products,
  number,
  device,
  customerPhone,
  storeName,
  track,
  points,
  catalog = [],
}: {
  ticket: TicketData;
  products: ServiceProduct[];
  number: string;
  device: string;
  customerPhone: string | null;
  storeName: string;
  /** Slug toko + ketersediaan promo/galeri di halaman lacak. */
  track?: ({ slug: string | null } & TrackExtras) | null;
  /** Poin member (pelanggan tertaut, tukar poin, poin didapat). */
  points?: JobLoyaltyInfo;
  /** Katalog jasa aktif (harga standar + interval perawatan). */
  catalog?: { id: string; name: string; price: number; intervalMonths: number }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // form state
  const [accessories, setAccessories] = useState(ticket.accessories ?? "");
  const [statusNote, setStatusNote] = useState(ticket.statusNote ?? "");
  // Sinkronkan input saat data server berubah (mis. fase berganti → keterangan dikosongkan).
  const [syncedNote, setSyncedNote] = useState(ticket.statusNote);
  if (syncedNote !== ticket.statusNote) {
    setSyncedNote(ticket.statusNote);
    setStatusNote(ticket.statusNote ?? "");
  }
  const [labor, setLabor] = useState(ticket.laborCost);
  const [discount, setDiscount] = useState(ticket.discount);
  const [lineName, setLineName] = useState("");
  const [lineCatalogId, setLineCatalogId] = useState("");
  const [linePrice, setLinePrice] = useState(0);
  const [lineQty, setLineQty] = useState(1);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("CASH");

  const outstanding = ticket.total - ticket.paid;
  const grossBeforeDiscount = ticket.laborCost + ticket.partsCost;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      setMsg(r.message ?? null);
    });
  }

  const meta = SERVICE_STATUS_META[ticket.status];
  const isClosed = ticket.status === "DELIVERED" || ticket.status === "CANCELLED";

  return (
    <div className="space-y-4">
      {/* Status workflow */}
      <Card>
        <CardHeader className="space-y-1.5">
          <CardTitle className="flex flex-wrap items-center gap-2">
            Status <Badge variant={meta.variant}>{meta.label}</Badge>
          </CardTitle>
          {ticket.statusNote && (
            <p className="text-sm">
              <span className="text-muted-foreground">Keterangan: </span>
              <span className="font-medium">{ticket.statusNote}</span>
              {ticket.statusNoteAt && (
                <span className="text-xs text-muted-foreground">
                  {" · "}
                  {formatLocalDateTime(ticket.statusNoteAt, { dateStyle: "medium", timeStyle: "short" })}
                </span>
              )}
            </p>
          )}
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SERVICE_FLOW.map((st) => (
            <Button
              key={st}
              variant={st === ticket.status ? "default" : "outline"}
              size="sm"
              disabled={pending || st === ticket.status}
              onClick={() => run(() => updateStatusAction(ticket.id, st))}
            >
              {SERVICE_STATUS_META[st].label}
            </Button>
          ))}
          {!isClosed && (
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm("Batalkan tiket servis ini?")) run(() => updateStatusAction(ticket.id, "CANCELLED"));
              }}
            >
              Batalkan
            </Button>
          )}
          {customerPhone && (
            <Button
              variant="outline"
              size="sm"
              className="text-success"
              onClick={() => {
                const text = buildServiceStatusText({
                  storeName,
                  number,
                  device,
                  statusLabel: meta.label,
                  statusNote: ticket.statusNote,
                  trackUrl: buildTrackUrl(window.location.origin, number, track?.slug),
                  trackExtras: track,
                });
                window.open(waLink(text, customerPhone), "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle /> Beri tahu via WhatsApp
            </Button>
          )}

          {/* Keterangan status bebas — lebih rinci dari fase, terlihat pelanggan */}
          <div className="mt-2 w-full space-y-2 border-t pt-3">
            <label htmlFor="status-note" className="text-sm font-medium">
              Keterangan status <span className="font-normal text-muted-foreground">(opsional · terlihat pelanggan di halaman lacak &amp; WA)</span>
            </label>
            <div className="flex gap-2">
              <Input
                id="status-note"
                value={statusNote}
                onChange={(e) => setStatusNote(e.target.value)}
                maxLength={120}
                placeholder={`mis. ${STATUS_NOTE_SUGGESTIONS[ticket.status][0] ?? "Sparepart dalam pengiriman, estimasi tiba Kamis"}`}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && statusNote.trim() !== (ticket.statusNote ?? "")) {
                    run(() => updateStatusNoteAction(ticket.id, statusNote));
                  }
                }}
              />
              <Button
                size="sm"
                className="h-9 shrink-0"
                disabled={pending || statusNote.trim() === (ticket.statusNote ?? "")}
                onClick={() => run(() => updateStatusNoteAction(ticket.id, statusNote))}
              >
                <Save /> Simpan
              </Button>
              {ticket.statusNote && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-9 shrink-0 text-destructive"
                  disabled={pending}
                  onClick={() => run(() => updateStatusNoteAction(ticket.id, ""))}
                  aria-label="Hapus keterangan status"
                >
                  <Trash2 />
                </Button>
              )}
            </div>
            {STATUS_NOTE_SUGGESTIONS[ticket.status].length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {STATUS_NOTE_SUGGESTIONS[ticket.status].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatusNote(s)}
                    className="rounded-full border px-2.5 py-0.5 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              Keterangan otomatis dikosongkan saat status berganti, agar pelanggan tak melihat info lama.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Items */}
      <Card>
        <CardHeader><CardTitle>Sparepart & Jasa</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {ticket.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Item</th>
                  <th className="p-2 text-center font-medium">Qty</th>
                  <th className="p-2 text-right font-medium">Harga</th>
                  <th className="p-2 text-right font-medium">Subtotal</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {ticket.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="p-2">
                      {it.name} {it.isPart && <Badge variant="muted">part</Badge>}
                    </td>
                    <td className="p-2 text-center">{it.qty}</td>
                    <td className="p-2 text-right">{formatRupiah(it.price)}</td>
                    <td className="p-2 text-right">{formatRupiah(it.subtotal)}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="size-7" disabled={pending}
                        onClick={() => run(() => removeItemAction(ticket.id, it.id))}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada item.</p>
          )}

          {/* Tambah sparepart dari inventory (memotong stok) */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">
              Tambah sparepart dari inventory{" "}
              <span className="font-normal text-success">— stok otomatis berkurang</span>
            </p>
            <PartPicker
              products={products}
              disabled={pending}
              placeholder="Cari sparepart dari inventory…"
              onAdd={(productId, qty) => run(() => addPartAction(ticket.id, productId, qty))}
            />
          </div>

          {/* Tambah jasa / biaya lain (TIDAK memotong stok) */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium">
              Tambah jasa / biaya lain{" "}
              <span className="font-normal text-muted-foreground">— tidak mengurangi stok</span>
            </p>
            {catalog.length > 0 && (
              <Select
                value={lineCatalogId}
                onChange={(e) => {
                  const c = catalog.find((x) => x.id === e.target.value);
                  setLineCatalogId(e.target.value);
                  if (c) {
                    setLineName(c.name);
                    setLinePrice(c.price);
                  }
                }}
                className="h-9"
                aria-label="Pilih dari katalog jasa"
              >
                <option value="">— Pilih dari Katalog Jasa (atau ketik bebas di bawah) —</option>
                {catalog.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {formatRupiah(c.price)}
                    {c.intervalMonths > 0 ? ` · ingatkan tiap ${intervalText(c.intervalMonths)}` : ""}
                  </option>
                ))}
              </Select>
            )}
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                value={lineName}
                onChange={(e) => {
                  setLineName(e.target.value);
                  setLineCatalogId(""); // diketik ulang → bukan jasa katalog lagi
                }}
                placeholder="Jasa lain (mis. Pasang OS)"
                className="flex-1"
              />
              <Input type="number" min="0" value={linePrice} onChange={(e) => setLinePrice(Math.max(0, Number(e.target.value)))} placeholder="Harga" className="sm:w-36" />
              <Input
                type="number"
                min="1"
                value={lineQty}
                onChange={(e) => setLineQty(clampQty(Number(e.target.value)))}
                placeholder="Qty"
                aria-label="Jumlah jasa"
                title="Jumlah"
                className="sm:w-20"
              />
              <Button variant="outline" disabled={pending || !lineName.trim()}
                onClick={() => {
                  run(() => addLineAction(ticket.id, lineName.trim(), linePrice, clampQty(lineQty), lineCatalogId || null));
                  setLineName(""); setLinePrice(0); setLineQty(1); setLineCatalogId("");
                }}>
                <Plus /> Tambah Jasa
              </Button>
            </div>
            {lineQty > 1 && linePrice > 0 && (
              <p className="text-xs text-muted-foreground">
                Subtotal {lineQty} × {formatRupiah(linePrice)} = {formatRupiah(linePrice * lineQty)}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Kelengkapan unit diterima (bisa diedit) */}
      <Card>
        <CardHeader><CardTitle>Kelengkapan Unit Diterima</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          <Textarea
            value={accessories}
            onChange={(e) => setAccessories(e.target.value)}
            placeholder="mis. Charger, tas, baterai, kabel, dus"
            maxLength={300}
            rows={2}
          />
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pending || accessories === (ticket.accessories ?? "")}
              onClick={() => run(() => updateAccessoriesAction(ticket.id, accessories))}
            >
              <Save className="size-3" /> Simpan Kelengkapan
            </Button>
            <span className="text-xs text-muted-foreground">Tercatat sebagai bukti serah terima; muncul di nota.</span>
          </div>
        </CardContent>
      </Card>

      {/* Biaya jasa & total */}
      <Card>
        <CardHeader><CardTitle>Biaya</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Biaya Jasa</span>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={labor} onChange={(e) => setLabor(Math.max(0, Number(e.target.value)))} className="h-8 w-36 text-right" />
              <Button variant="outline" size="sm" disabled={pending || labor === ticket.laborCost}
                onClick={() => run(() => updateLaborAction(ticket.id, labor))}>
                <Save className="size-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sparepart & jasa lain</span><span>{formatRupiah(ticket.partsCost)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Diskon</span>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max={grossBeforeDiscount} value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))}
                className="h-8 w-36 text-right" />
              <Button variant="outline" size="sm" disabled={pending || discount === ticket.discount}
                onClick={() => run(() => updateServiceDiscountAction(ticket.id, discount))}>
                <Save className="size-3" />
              </Button>
            </div>
          </div>
          {ticket.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Potongan diskon</span><span>-{formatRupiah(ticket.discount)}</span>
            </div>
          )}
          {points && <JobPointsPanel kind="service" id={ticket.id} info={points} outstanding={outstanding} linkable={!!customerPhone} />}
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatRupiah(ticket.total)}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Dibayar{ticket.paymentMethod ? ` · ${METHOD_LABEL[ticket.paymentMethod] ?? ticket.paymentMethod}` : ""}
            </span>
            <span>{formatRupiah(ticket.paid)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>{outstanding < 0 ? "Lebih bayar" : "Sisa"}</span>
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>{formatRupiah(Math.abs(outstanding))}</span>
          </div>

          {outstanding > 0 && (
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row sm:items-end">
              <div className="flex flex-1 flex-col gap-1">
                <label className="text-xs text-muted-foreground">Terima pembayaran (maks {outstanding.toLocaleString("id-ID")})</label>
                <Input type="number" min="1" max={outstanding} value={payAmount || ""} onChange={(e) => setPayAmount(Math.max(0, Number(e.target.value)))} placeholder="0" />
              </div>
              <div className="flex flex-col gap-1 sm:w-40">
                <label className="text-xs text-muted-foreground">Metode</label>
                <Select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="h-10">
                  <option value="CASH">Tunai</option>
                  <option value="TRANSFER">Transfer</option>
                  <option value="QRIS">QRIS</option>
                  <option value="CREDIT">Kredit/Tempo</option>
                </Select>
              </div>
              <Button disabled={pending || payAmount <= 0}
                onClick={() => { run(() => recordServicePaymentAction(ticket.id, payAmount, payMethod)); setPayAmount(0); }}>
                <HandCoins /> Terima
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {msg && <p className="rounded-md bg-muted px-3 py-2 text-sm">{msg}</p>}
    </div>
  );
}
