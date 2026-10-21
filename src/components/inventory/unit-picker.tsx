"use client";

import { useMemo, useState } from "react";
import { Search, Recycle, Handshake } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn, formatRupiah } from "@/lib/utils";
import { matchUnit, UNIT_KIND_LABEL, type UnitKind, type UnitOption } from "@/lib/build-units";

/**
 * Pemilih komponen dari Barang Bekas & Titip Jual (unit tunggal). Cari nama,
 * no. BK/TJ, pemilik, atau scan/ketik no. seri; chip jenis menampilkan daftar
 * tanpa harus mengetik. Unit di `exclude` (sudah dipilih) disembunyikan.
 */
export function UnitPicker({
  units,
  onPick,
  disabled,
  exclude,
}: {
  units: UnitOption[];
  onPick: (u: UnitOption) => void;
  disabled?: boolean;
  exclude?: Set<string>;
}) {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<UnitKind | null>(null);

  const pool = useMemo(() => units.filter((u) => !exclude?.has(u.id)), [units, exclude]);
  const counts = { used: pool.filter((u) => u.kind === "used").length, consignment: pool.filter((u) => u.kind === "consignment").length };
  // Chip jenis yang isinya sudah habis (mis. unit terakhir baru dipilih) tak ikut menyaring.
  const activeKind = kind && counts[kind] > 0 ? kind : null;
  const browsing = search.trim() !== "" || activeKind !== null;
  const results = browsing
    ? pool.filter((u) => (activeKind ? u.kind === activeKind : true) && matchUnit(u, search)).slice(0, 12)
    : [];

  if (pool.length === 0) {
    return <p className="text-xs text-muted-foreground">Tidak ada barang bekas / titipan yang tersedia.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari barang bekas / titipan (nama, BK/TJ, no. seri)…"
            className="pl-9"
            disabled={disabled}
          />
        </div>
        {(["used", "consignment"] as const).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKind((cur) => (cur === k ? null : k))}
            aria-pressed={activeKind === k}
            disabled={disabled || counts[k] === 0}
            className={cn(
              "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:opacity-50",
              activeKind === k ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent",
            )}
          >
            {k === "used" ? <Recycle className="size-3.5" /> : <Handshake className="size-3.5" />}
            {UNIT_KIND_LABEL[k]} ({counts[k]})
          </button>
        ))}
      </div>
      {browsing && (
        <div className="max-h-72 overflow-y-auto rounded-md border">
          {results.length === 0 ? (
            <p className="px-3 py-2 text-sm text-muted-foreground">Tidak ditemukan.</p>
          ) : (
            results.map((u) => (
              <button
                key={u.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  onPick(u);
                  setSearch("");
                }}
                className="flex w-full items-start justify-between gap-3 border-b px-3 py-2 text-left text-sm last:border-0 hover:bg-accent disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-1.5">
                    <span
                      className={cn(
                        "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                        u.kind === "used"
                          ? "bg-sky-500/20 text-sky-700 dark:text-sky-300"
                          : "bg-amber-500/20 text-amber-700 dark:text-amber-300",
                      )}
                    >
                      {UNIT_KIND_LABEL[u.kind]}
                    </span>
                    <span className="font-medium">{u.name}</span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    <span className="font-mono">{u.ref}</span> · {u.detail}
                  </span>
                </span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums">{formatRupiah(u.sellPrice)}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
