"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BadgeCheck, Undo2, PackageX, Pencil, Check, X, Trash2 } from "lucide-react";
import {
  setConsignmentItemStatusAction,
  updateConsignmentItemPriceAction,
  deleteConsignmentAction,
} from "@/server/consignment/actions";
import type { ConsignmentStatus } from "@/lib/consignment-calc";
import { formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
}

export function ConsignmentDetail({ consignmentId, items }: { consignmentId: string; items: DetailItem[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  // Mode edit: harga diinginkan (edit) atau harga terjual (sell) untuk satu item.
  const [editing, setEditing] = useState<{ id: string; mode: "edit" | "sell"; value: number } | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, success?: string) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        if (success) toast.success(success);
        setEditing(null);
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }

  function confirmEditing() {
    if (!editing) return;
    if (editing.mode === "edit") {
      run(() => updateConsignmentItemPriceAction(editing.id, editing.value), "Harga diperbarui");
    } else {
      run(() => setConsignmentItemStatusAction(editing.id, "SOLD", editing.value), "Ditandai terjual");
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
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Barang Titipan</CardTitle>
        <Button variant="ghost" size="sm" className="text-destructive" onClick={remove} disabled={pending}>
          <Trash2 className="size-4" /> Hapus
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((it, i) => {
          const meta = CONSIGNMENT_STATUS_META[it.status];
          const isEditing = editing?.id === it.id;
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

              <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-2">
                <div className="text-sm">
                  <span className="text-muted-foreground">Harga diinginkan </span>
                  <span className="font-mono font-bold tabular-nums">{formatRupiah(it.askingPrice)}</span>
                  {it.status === "SOLD" && it.soldPrice != null && (
                    <span className="text-success"> · terjual <span className="font-mono">{formatRupiah(it.soldPrice)}</span></span>
                  )}
                  {it.statusAtText && it.status !== "AVAILABLE" && (
                    <span className="text-xs text-muted-foreground"> · {it.statusAtText}</span>
                  )}
                </div>

                {!isEditing && (
                  <div className="flex flex-wrap gap-1.5">
                    {it.status === "AVAILABLE" ? (
                      <>
                        <Button size="sm" variant="outline" disabled={pending} onClick={() => setEditing({ id: it.id, mode: "edit", value: it.askingPrice })}>
                          <Pencil className="size-3.5" /> Ubah harga
                        </Button>
                        <Button size="sm" disabled={pending} onClick={() => setEditing({ id: it.id, mode: "sell", value: it.askingPrice })}>
                          <BadgeCheck className="size-3.5" /> Terjual
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
                      </>
                    ) : (
                      <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setConsignmentItemStatusAction(it.id, "AVAILABLE"), "Dikembalikan ke Dititipkan")}>
                        <Undo2 className="size-3.5" /> Batalkan ({meta.label.toLowerCase()})
                      </Button>
                    )}
                  </div>
                )}
              </div>

              {isEditing && editing && (
                <div className="flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-2">
                  <span className="text-sm">{editing.mode === "edit" ? "Harga diinginkan baru" : "Harga terjual"}</span>
                  <CurrencyInput
                    value={editing.value}
                    onValueChange={(v) => setEditing({ ...editing, value: v })}
                    className="h-8 w-40"
                    autoFocus
                  />
                  <Button size="sm" onClick={confirmEditing} disabled={pending}>
                    <Check className="size-3.5" /> Simpan
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditing(null)} disabled={pending} aria-label="Batal">
                    <X className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
