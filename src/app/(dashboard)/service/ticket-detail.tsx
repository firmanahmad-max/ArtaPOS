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
  updateStatusAction,
  recordServicePaymentAction,
} from "@/server/service-jobs/actions";
import { formatRupiah } from "@/lib/utils";
import { buildServiceStatusText, waLink } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PartPicker } from "@/components/inventory/part-picker";
import { SERVICE_STATUS_META, SERVICE_FLOW } from "./status-config";

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
  laborCost: number;
  partsCost: number;
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
}: {
  ticket: TicketData;
  products: ServiceProduct[];
  number: string;
  device: string;
  customerPhone: string | null;
  storeName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  // form state
  const [labor, setLabor] = useState(ticket.laborCost);
  const [lineName, setLineName] = useState("");
  const [linePrice, setLinePrice] = useState(0);
  const [payAmount, setPayAmount] = useState(0);
  const [payMethod, setPayMethod] = useState("CASH");

  const outstanding = ticket.total - ticket.paid;

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
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            Status <Badge variant={meta.variant}>{meta.label}</Badge>
          </CardTitle>
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
                  trackUrl: `${window.location.origin}/lacak?no=${encodeURIComponent(number)}`,
                });
                window.open(waLink(text, customerPhone), "_blank", "noopener,noreferrer");
              }}
            >
              <MessageCircle /> Beri tahu via WhatsApp
            </Button>
          )}
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
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input value={lineName} onChange={(e) => setLineName(e.target.value)} placeholder="Jasa lain (mis. Pasang OS)" className="flex-1" />
              <Input type="number" min="0" value={linePrice} onChange={(e) => setLinePrice(Math.max(0, Number(e.target.value)))} placeholder="Harga" className="sm:w-36" />
              <Button variant="outline" disabled={pending || !lineName.trim()}
                onClick={() => { run(() => addLineAction(ticket.id, lineName.trim(), linePrice, 1)); setLineName(""); setLinePrice(0); }}>
                <Plus /> Tambah Jasa
              </Button>
            </div>
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
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatRupiah(ticket.total)}</span></div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">
              Dibayar{ticket.paymentMethod ? ` · ${METHOD_LABEL[ticket.paymentMethod] ?? ticket.paymentMethod}` : ""}
            </span>
            <span>{formatRupiah(ticket.paid)}</span>
          </div>
          <div className="flex justify-between font-medium">
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>Sisa</span>
            <span className={outstanding > 0 ? "text-destructive" : "text-success"}>{formatRupiah(outstanding)}</span>
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
