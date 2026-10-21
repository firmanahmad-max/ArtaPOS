"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Save, HandCoins } from "lucide-react";
import type { BuildStatus } from "@/generated/prisma/enums";
import {
  addComponentAction,
  addUnitComponentAction,
  removeComponentAction,
  updateBuildFeeAction,
  updateBuildDiscountAction,
  updateBuildStatusAction,
  recordBuildPaymentAction,
} from "@/server/pcbuild/actions";
import { formatRupiah } from "@/lib/utils";
import { PartPicker } from "@/components/inventory/part-picker";
import { UnitPicker } from "@/components/inventory/unit-picker";
import { UNIT_KIND_LABEL, type UnitKind, type UnitOption } from "@/lib/build-units";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BUILD_STATUS_META, BUILD_FLOW } from "./build-status";
import { JobPointsPanel, type JobLoyaltyInfo } from "@/components/loyalty/job-points-panel";

export interface BuildItem {
  id: string;
  productName: string;
  qty: number;
  price: number;
  subtotal: number;
  /** Barang bekas / titipan (unit tunggal); null = produk inventory / komponen bebas. */
  unit: { kind: UnitKind; ref: string | null } | null;
}
export interface BuildData {
  id: string;
  status: BuildStatus;
  buildFee: number;
  componentsCost: number;
  discount: number;
  total: number;
  paid: number;
  items: BuildItem[];
}
export interface BuildProduct { id: string; name: string; sellPrice: number; stock: number }

export function BuildDetail({
  build,
  products,
  units = [],
  points,
}: {
  build: BuildData;
  products: BuildProduct[];
  /** Barang bekas & titipan yang tersedia untuk dijadikan komponen. */
  units?: UnitOption[];
  /** Poin member (pelanggan tertaut, tukar poin, poin didapat). */
  points?: JobLoyaltyInfo;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [fee, setFee] = useState(build.buildFee);
  const [discount, setDiscount] = useState(build.discount);
  const [payAmount, setPayAmount] = useState(0);

  const outstanding = build.total - build.paid;
  const grossBeforeDiscount = build.buildFee + build.componentsCost;

  function run(fn: () => Promise<{ ok: boolean; message?: string }>) {
    setMsg(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      setMsg(r.message ?? null);
    });
  }

  const meta = BUILD_STATUS_META[build.status];
  const isClosed = build.status === "DELIVERED" || build.status === "CANCELLED";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">Status <Badge variant={meta.variant}>{meta.label}</Badge></CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {BUILD_FLOW.map((st) => (
            <Button key={st} variant={st === build.status ? "default" : "outline"} size="sm"
              disabled={pending || st === build.status} onClick={() => run(() => updateBuildStatusAction(build.id, st))}>
              {BUILD_STATUS_META[st].label}
            </Button>
          ))}
          {!isClosed && (
            <Button variant="destructive" size="sm" disabled={pending}
              onClick={() => { if (confirm("Batalkan rakitan ini? Komponen tidak otomatis dikembalikan — hapus komponennya dulu agar stok, barang bekas & titipan kembali tersedia.")) run(() => updateBuildStatusAction(build.id, "CANCELLED")); }}>
              Batalkan
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Komponen</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          {build.items.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Komponen</th>
                  <th className="p-2 text-center font-medium">Qty</th>
                  <th className="p-2 text-right font-medium">Harga</th>
                  <th className="p-2 text-right font-medium">Subtotal</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {build.items.map((it) => (
                  <tr key={it.id} className="border-b last:border-0">
                    <td className="p-2">
                      {it.productName}
                      {it.unit && (
                        <span
                          className={
                            "ml-1.5 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-semibold " +
                            (it.unit.kind === "used"
                              ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                              : "bg-amber-500/20 text-amber-700 dark:text-amber-300")
                          }
                        >
                          {UNIT_KIND_LABEL[it.unit.kind]}{it.unit.ref ? ` · ${it.unit.ref}` : ""}
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-center">{it.qty}</td>
                    <td className="p-2 text-right">{formatRupiah(it.price)}</td>
                    <td className="p-2 text-right">{formatRupiah(it.subtotal)}</td>
                    <td className="p-2 text-right">
                      <Button variant="ghost" size="icon" className="size-7" disabled={pending}
                        onClick={() => run(() => removeComponentAction(build.id, it.id))}>
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada komponen.</p>
          )}

          <PartPicker
            products={products}
            disabled={pending}
            placeholder="Cari komponen dari inventory…"
            onAdd={(productId, qty) => run(() => addComponentAction(build.id, productId, qty))}
          />
          <div className="space-y-1.5 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground">
              Atau ambil dari Barang Bekas / Titip Jual — unit langsung ditandai terpakai di rakitan ini & hilang dari kasir/galeri.
            </p>
            <UnitPicker
              units={units}
              disabled={pending}
              onPick={(u) => run(() => addUnitComponentAction(build.id, u.kind, u.id))}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Biaya</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Jasa Rakit</span>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" value={fee} onChange={(e) => setFee(Math.max(0, Number(e.target.value)))} className="h-8 w-36 text-right" />
              <Button variant="outline" size="sm" disabled={pending || fee === build.buildFee} onClick={() => run(() => updateBuildFeeAction(build.id, fee))}>
                <Save className="size-3" />
              </Button>
            </div>
          </div>
          <div className="flex justify-between"><span className="text-muted-foreground">Komponen</span><span>{formatRupiah(build.componentsCost)}</span></div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Diskon</span>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max={grossBeforeDiscount} value={discount}
                onChange={(e) => setDiscount(Math.max(0, Number(e.target.value)))} className="h-8 w-36 text-right" />
              <Button variant="outline" size="sm" disabled={pending || discount === build.discount}
                onClick={() => run(() => updateBuildDiscountAction(build.id, discount))}>
                <Save className="size-3" />
              </Button>
            </div>
          </div>
          {build.discount > 0 && (
            <div className="flex justify-between text-success">
              <span>Potongan diskon</span><span>-{formatRupiah(build.discount)}</span>
            </div>
          )}
          {points && <JobPointsPanel kind="build" id={build.id} info={points} outstanding={outstanding} />}
          <div className="flex justify-between border-t pt-2 text-base font-bold"><span>Total</span><span>{formatRupiah(build.total)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Dibayar</span><span>{formatRupiah(build.paid)}</span></div>
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
              <Button disabled={pending || payAmount <= 0} onClick={() => { run(() => recordBuildPaymentAction(build.id, payAmount)); setPayAmount(0); }}>
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
