"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Undo2, PackageX, Pencil, Check, X, Trash2, Wallet, Receipt, Images } from "lucide-react";
import { addConsignmentToGalleryAction } from "@/server/gallery/actions";
import {
  setConsignmentItemStatusAction,
  updateConsignmentItemTermsAction,
  setOwnerPaidAction,
  payAllOwnerAction,
  deleteConsignmentAction,
} from "@/server/consignment/actions";
import { commissionLabel, splitConsignment, type CommissionType, type ConsignmentStatus } from "@/lib/consignment-calc";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONSIGNMENT_STATUS_META } from "./status-config";

export interface DetailItem {
  id: string;
  category: string;
  name: string;
  serialNumber: string | null;
  condition: string | null;
  askingPrice: number;
  status: ConsignmentStatus;
  soldPrice: number | null;
  statusAtText: string | null;
  commissionType: CommissionType;
  commissionValue: number;
  storeCommission: number | null;
  ownerShare: number | null;
  saleId: string | null;
  saleNumber: string | null;
  ownerPaidAtText: string | null;
  /** Dipajang di Galeri Publik? (null = belum). */
  gallery: { active: boolean } | null;
}

type Editing =
  | { id: string; mode: "terms"; price: number; ctype: CommissionType; cvalue: number }
  | { id: string; mode: "sell"; price: number };

export function ConsignmentDetail({
  consignmentId,
  ownerOwed,
  items,
}: {
  consignmentId: string;
  ownerOwed: number;
  items: DetailItem[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [editing, setEditing] = useState<Editing | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, success?: string) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? success ?? "Tersimpan");
        setEditing(null);
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  function confirmEditing() {
    if (!editing) return;
    if (editing.mode === "terms") {
      run(() =>
        updateConsignmentItemTermsAction(editing.id, {
          askingPrice: editing.price,
          commissionType: editing.ctype,
          commissionValue: editing.cvalue,
        }),
      );
    } else {
      run(() => setConsignmentItemStatusAction(editing.id, "SOLD", editing.price), "Ditandai terjual");
    }
  }

  function remove() {
    if (!confirm("Hapus seluruh catatan titip jual ini? Tindakan ini tidak bisa dibatalkan.")) return;
    start(async () => {
      const r = await deleteConsignmentAction(consignmentId);
      if (r.ok) {
        toast.success("Titip jual dihapus");
        router.push("/consignments");
      } else toast.error(r.message ?? "Gagal menghapus.");
    });
  }

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Barang Titipan</CardTitle>
        <div className="flex flex-wrap gap-2">
          {ownerOwed > 0 && (
            <Button
              size="sm"
              disabled={pending}
              onClick={() => {
                if (confirm(`Catat pembayaran hak pemilik sebesar ${formatRupiah(ownerOwed)}?`)) {
                  run(() => payAllOwnerAction(consignmentId));
                }
              }}
            >
              <Wallet className="size-4" /> Bayar hak pemilik {formatRupiah(ownerOwed)}
            </Button>
          )}
          <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={pending}>
            <Trash2 className="size-4" /> Hapus
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, i) => {
          const meta = CONSIGNMENT_STATUS_META[it.status];
          const isEditing = editing?.id === it.id;
          const terms = commissionLabel(it.commissionType, it.commissionValue, formatRupiah);
          return (
            <div key={it.id} className="space-y-2 rounded-xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Barang {i + 1} · {it.category}</p>
                  <p className="font-semibold">{it.name}</p>
                  {it.serialNumber && <p className="font-mono text-xs text-muted-foreground">SN: {it.serialNumber}</p>}
                </div>
                <Badge variant={meta.variant}>{meta.label}</Badge>
              </div>
              {it.condition && (
                <p className="whitespace-pre-line text-sm"><span className="text-muted-foreground">Kondisi: </span>{it.condition}</p>
              )}

              <div className="text-sm">
                <span className="text-muted-foreground">Harga diinginkan </span>
                <span className="font-mono font-bold tabular-nums">{formatRupiah(it.askingPrice)}</span>
                <span className="text-muted-foreground"> · komisi toko {terms}</span>
              </div>

              {/* Bagi hasil barang terjual + status pembayaran hak pemilik */}
              {it.status === "SOLD" && it.ownerShare != null && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Terjual <span className="font-mono font-semibold">{formatRupiah(it.soldPrice ?? it.askingPrice)}</span>
                      {it.statusAtText && <span className="text-xs text-muted-foreground"> · {it.statusAtText}</span>}
                    </span>
                    {it.saleId ? (
                      <Link href={`/sales/${it.saleId}`} className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline">
                        <Receipt className="size-3.5" /> via kasir {it.saleNumber ?? ""}
                      </Link>
                    ) : (
                      <span className="text-xs text-muted-foreground">dicatat manual (di luar kasir)</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <span className="text-muted-foreground">
                      Komisi toko <span className="font-mono text-foreground">{formatRupiah(it.storeCommission ?? 0)}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Hak pemilik <span className="font-mono font-semibold text-foreground">{formatRupiah(it.ownerShare)}</span>
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                    {it.ownerPaidAtText ? (
                      <span className="text-success">✓ Hak pemilik dibayar {it.ownerPaidAtText}</span>
                    ) : (
                      <span className="font-medium text-amber-600 dark:text-amber-400">Hak pemilik belum dibayar</span>
                    )}
                    {it.ownerPaidAtText ? (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setOwnerPaidAction(it.id, false), "Pembayaran dibatalkan")}>
                        <Undo2 className="size-3.5" /> Batalkan bayar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => setOwnerPaidAction(it.id, true), "Hak pemilik ditandai dibayar")}>
                        <Wallet className="size-3.5" /> Tandai dibayar
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!isEditing && (
                <div className="flex flex-wrap gap-1.5 border-t pt-2">
                  {it.status === "AVAILABLE" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => setEditing({ id: it.id, mode: "terms", price: it.askingPrice, ctype: it.commissionType, cvalue: it.commissionValue })}
                      >
                        <Pencil className="size-3.5" /> Ubah harga & komisi
                      </Button>
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing({ id: it.id, mode: "sell", price: it.askingPrice })}>
                        <BadgeCheck className="size-3.5" /> Terjual (di luar kasir)
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={pending}
                        onClick={() => {
                          if (confirm(`Tandai "${it.name}" sudah diambil kembali oleh pemilik?`)) {
                            run(() => setConsignmentItemStatusAction(it.id, "RETURNED"), "Ditandai diambil kembali");
                          }
                        }}
                      >
                        <PackageX className="size-3.5" /> Diambil kembali
                      </Button>
                      {it.gallery ? (
                        <Link
                          href="/gallery"
                          className="inline-flex items-center gap-1 self-center px-2 text-xs font-medium text-success hover:underline"
                        >
                          <Images className="size-3.5" /> {it.gallery.active ? "Tampil di Galeri" : "Di Galeri (disembunyikan)"}
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={pending}
                          onClick={() => run(() => addConsignmentToGalleryAction(it.id))}
                        >
                          <Images className="size-3.5" /> Tampilkan di Galeri
                        </Button>
                      )}
                    </>
                  )}
                  {it.status === "SOLD" && it.saleId && (
                    <p className="text-xs text-muted-foreground">
                      Terjual lewat kasir — untuk membatalkan, lakukan void/retur pada penjualannya.
                    </p>
                  )}
                  {it.status !== "AVAILABLE" && it.gallery && (
                    <p className="w-full text-xs text-muted-foreground">
                      <Images className="mr-1 inline size-3.5" />
                      Otomatis disembunyikan dari Galeri Publik.
                    </p>
                  )}
                  {((it.status === "SOLD" && !it.saleId && !it.ownerPaidAtText) || it.status === "RETURNED") && (
                    <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setConsignmentItemStatusAction(it.id, "AVAILABLE"), "Dikembalikan ke Dititipkan")}>
                      <Undo2 className="size-3.5" /> Batalkan ({meta.label.toLowerCase()})
                    </Button>
                  )}
                </div>
              )}

              {isEditing && editing && (
                <div className="space-y-2 rounded-lg bg-muted/50 p-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="flex flex-col gap-1 text-xs">
                      {editing.mode === "terms" ? "Harga diinginkan" : "Harga terjual"}
                      <CurrencyInput
                        value={editing.price}
                        onValueChange={(v) => setEditing({ ...editing, price: v })}
                        className="h-8 w-40"
                        autoFocus
                      />
                    </label>
                    {editing.mode === "terms" && (
                      <>
                        <label className="flex flex-col gap-1 text-xs">
                          Komisi
                          <Select
                            value={editing.ctype}
                            onChange={(e) => {
                              const t = e.target.value as CommissionType;
                              setEditing({ ...editing, ctype: t, cvalue: t === "PERCENT" ? 10 : 50_000 });
                            }}
                            className="h-8 w-32"
                          >
                            <option value="PERCENT">Persen</option>
                            <option value="FIXED">Nominal</option>
                          </Select>
                        </label>
                        <label className="flex flex-col gap-1 text-xs">
                          {editing.ctype === "PERCENT" ? "%" : "Rp"}
                          {editing.ctype === "PERCENT" ? (
                            <Input
                              inputMode="numeric"
                              className="h-8 w-20"
                              value={String(editing.cvalue)}
                              onChange={(e) => setEditing({ ...editing, cvalue: Math.min(100, Number(e.target.value.replace(/[^0-9]/g, "")) || 0) })}
                            />
                          ) : (
                            <CurrencyInput className="h-8 w-36" value={editing.cvalue} onValueChange={(v) => setEditing({ ...editing, cvalue: v })} />
                          )}
                        </label>
                      </>
                    )}
                    <Button size="sm" onClick={confirmEditing} disabled={pending}>
                      <Check className="size-3.5" /> Simpan
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={pending} aria-label="Batal">
                      <X className="size-3.5" />
                    </Button>
                  </div>
                  {(() => {
                    const s =
                      editing.mode === "terms"
                        ? splitConsignment(editing.price, editing.ctype, editing.cvalue)
                        : splitConsignment(editing.price, it.commissionType, it.commissionValue);
                    return (
                      <p className="text-xs text-muted-foreground">
                        Bila laku {formatRupiah(editing.price)}: komisi toko{" "}
                        <span className="font-mono">{formatRupiah(s.commission)}</span> · hak pemilik{" "}
                        <span className="font-mono font-medium text-foreground">{formatRupiah(s.ownerShare)}</span>
                        {editing.mode === "sell" && " · catatan manual ini tidak masuk laporan keuangan (jual lewat kasir agar tercatat)."}
                      </p>
                    );
                  })()}
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
