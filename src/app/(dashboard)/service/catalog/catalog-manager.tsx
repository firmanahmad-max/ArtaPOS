"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Check, X, Sparkles, Loader2 } from "lucide-react";
import {
  deleteCatalogItemAction,
  saveCatalogItemAction,
  seedCatalogDefaultsAction,
  setCatalogActiveAction,
} from "@/server/service-catalog/actions";
import { intervalText } from "@/lib/service-reminder";
import { cn, formatRupiah } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface CatalogRow {
  id: string;
  name: string;
  price: number;
  intervalMonths: number;
  isActive: boolean;
}
type Draft = { id: string | null; name: string; price: number; intervalMonths: number };

const PRESETS = [0, 3, 6, 12];

function IntervalPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {PRESETS.map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => onChange(m)}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-xs transition-colors",
            value === m ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50",
          )}
        >
          {m === 0 ? "Tidak berkala" : intervalText(m)}
        </button>
      ))}
      <Input
        inputMode="numeric"
        aria-label="Interval (bulan)"
        className="h-7 w-16 text-xs"
        value={String(value)}
        onChange={(e) => onChange(Math.min(60, Number(e.target.value.replace(/[^0-9]/g, "")) || 0))}
      />
      <span className="text-xs text-muted-foreground">bulan</span>
    </div>
  );
}

export function CatalogManager({ items }: { items: CatalogRow[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [draft, setDraft] = useState<Draft | null>(null);

  function run(fn: () => Promise<{ ok: boolean; message?: string }>, after?: () => void) {
    start(async () => {
      const r = await fn();
      if (r.ok) {
        toast.success(r.message ?? "Tersimpan");
        after?.();
        router.refresh();
      } else toast.error(r.message ?? "Gagal.");
    });
  }
  const save = () =>
    draft &&
    run(
      () => saveCatalogItemAction(draft.id, { name: draft.name, price: draft.price, intervalMonths: draft.intervalMonths }),
      () => setDraft(null),
    );

  const editor = draft && (
    <div className="space-y-3 rounded-xl border bg-muted/40 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
        <Input autoFocus value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Nama jasa (mis. Cleaning & repaste laptop)" maxLength={80} />
        <CurrencyInput value={draft.price} onValueChange={(v) => setDraft({ ...draft, price: v })} placeholder="Harga standar" />
      </div>
      <div className="space-y-1">
        <p className="text-xs font-medium">Ingatkan pelanggan untuk servis serupa setelah</p>
        <IntervalPicker value={draft.intervalMonths} onChange={(n) => setDraft({ ...draft, intervalMonths: n })} />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={save} disabled={pending || !draft.name.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <Check />} Simpan
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={pending}>
          <X /> Batal
        </Button>
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle>Daftar Jasa</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={pending} onClick={() => run(seedCatalogDefaultsAction)}>
            <Sparkles /> Tambah contoh jasa
          </Button>
          <Button size="sm" disabled={pending || draft?.id === null} onClick={() => setDraft({ id: null, name: "", price: 0, intervalMonths: 6 })}>
            <Plus /> Jasa baru
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {draft?.id === null && editor}
        {items.length === 0 && !draft && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Belum ada jasa. Tekan <strong>Tambah contoh jasa</strong> untuk memulai dengan jasa umum toko komputer.
          </p>
        )}
        {items.map((it) =>
          draft?.id === it.id ? (
            <div key={it.id}>{editor}</div>
          ) : (
            <div key={it.id} className={cn("flex flex-wrap items-center gap-3 rounded-xl border p-3", !it.isActive && "opacity-60")}>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{it.name}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-mono">{formatRupiah(it.price)}</span>
                  {" · "}
                  {it.intervalMonths > 0 ? <>ingatkan tiap <strong>{intervalText(it.intervalMonths)}</strong></> : "tidak berkala"}
                </p>
              </div>
              {!it.isActive && <Badge variant="muted">Nonaktif</Badge>}
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDraft({ id: it.id, name: it.name, price: it.price, intervalMonths: it.intervalMonths })} aria-label="Ubah">
                  <Pencil className="size-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={pending} onClick={() => run(() => setCatalogActiveAction(it.id, !it.isActive))}>
                  {it.isActive ? "Nonaktifkan" : "Aktifkan"}
                </Button>
                <Button size="sm" variant="ghost" className="text-destructive" disabled={pending} onClick={() => run(() => deleteCatalogItemAction(it.id))} aria-label="Hapus">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            </div>
          ),
        )}
        <p className="text-xs text-muted-foreground">
          Di detail tiket, pilih jasa dari katalog saat menambah jasa — sistem mencatatnya sebagai riwayat perawatan
          perangkat pelanggan &amp; menghitung jadwal pengingat berikutnya.
        </p>
      </CardContent>
    </Card>
  );
}
