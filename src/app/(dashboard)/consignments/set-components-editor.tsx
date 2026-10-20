"use client";

import { Plus, Trash2 } from "lucide-react";
import { MAX_SET_COMPONENTS, parseComponents, type SetComponent } from "@/lib/consignment-set";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Satu baris komponen di editor (key stabil untuk React). */
export interface PartRow {
  key: string;
  name: string;
  serialNumber: string;
  note: string;
}

export const blankPart = (key: string): PartRow => ({ key, name: "", serialNumber: "", note: "" });

/** Baris editor → payload server (baris tanpa nama dibuang). */
export const partsPayload = (parts: PartRow[]): SetComponent[] =>
  parseComponents(parts.map((p) => ({ name: p.name, serialNumber: p.serialNumber, note: p.note })));

export const partsFromComponents = (list: SetComponent[], nextKey: () => string): PartRow[] =>
  list.map((c) => ({ key: nextKey(), name: c.name, serialNumber: c.serialNumber ?? "", note: c.note ?? "" }));

/** Saran nama komponen paket (tetap bisa diketik bebas). */
const PART_SUGGESTIONS = [
  "CPU / Unit PC",
  "Monitor",
  "Keyboard",
  "Mouse",
  "Speaker",
  "Headset",
  "UPS",
  "Webcam",
  "Kabel power & HDMI",
  "Dus / box",
];

/**
 * Editor rincian isi paket/set: nama komponen, no. seri (opsional) & catatan.
 * TANPA harga per komponen — harga paket tetap satu.
 */
export function SetComponentsEditor({
  idPrefix,
  parts,
  onChange,
  nextKey,
  disabled,
}: {
  idPrefix: string;
  parts: PartRow[];
  onChange: (parts: PartRow[]) => void;
  /** Dipanggil di event handler (bukan saat render) untuk key baris baru. */
  nextKey: () => string;
  disabled?: boolean;
}) {
  const patch = (key: string, p: Partial<PartRow>) => onChange(parts.map((x) => (x.key === key ? { ...x, ...p } : x)));
  const listId = `${idPrefix}-part-names`;
  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-muted/30 p-3">
      <datalist id={listId}>
        {PART_SUGGESTIONS.map((s) => <option key={s} value={s} />)}
      </datalist>
      <p className="text-xs font-semibold">Isi paket <span className="font-normal text-muted-foreground">— tanpa harga per komponen</span></p>
      {parts.map((p, i) => (
        <div key={p.key} className="grid grid-cols-[1fr_auto] gap-2 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <Input
            aria-label={`Komponen ${i + 1}`}
            list={listId}
            value={p.name}
            onChange={(e) => patch(p.key, { name: e.target.value })}
            placeholder={i === 0 ? "mis. CPU Ryzen 5 5600 / RTX 3060" : "mis. Monitor LG 24\""}
            maxLength={120}
            disabled={disabled}
            className="h-9"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-9 text-destructive sm:order-last"
            onClick={() => onChange(parts.filter((x) => x.key !== p.key))}
            aria-label={`Hapus komponen ${i + 1}`}
            disabled={disabled}
          >
            <Trash2 className="size-4" />
          </Button>
          <Input
            aria-label={`No. seri komponen ${i + 1}`}
            value={p.serialNumber}
            onChange={(e) => patch(p.key, { serialNumber: e.target.value })}
            placeholder="No. seri (opsional)"
            maxLength={60}
            disabled={disabled}
            className="h-9 font-mono text-xs max-sm:col-span-2"
          />
          <Input
            aria-label={`Catatan komponen ${i + 1}`}
            value={p.note}
            onChange={(e) => patch(p.key, { note: e.target.value })}
            placeholder="Catatan (opsional)"
            maxLength={120}
            disabled={disabled}
            className="h-9 max-sm:col-span-2"
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...parts, blankPart(nextKey())])}
        disabled={disabled || parts.length >= MAX_SET_COMPONENTS}
      >
        <Plus className="size-3.5" /> Tambah komponen
      </Button>
    </div>
  );
}
