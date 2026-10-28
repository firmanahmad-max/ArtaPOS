"use client";

import { useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { cn, formatRupiah } from "@/lib/utils";
import {
  activeFilterCount,
  EMPTY_FILTERS,
  filterGallery,
  galleryFacets,
  galleryQueryString,
  type GalleryCard,
  type GalleryFilters,
  type GallerySort,
} from "@/lib/gallery-filter";
import { ChatWaButton } from "./gallery-tracker";
import { ShareButton } from "./share-button";

export type BrowserItem = GalleryCard & { waHref: string | null };

const SORTS: { id: GallerySort; label: string }[] = [
  { id: "default", label: "Pilihan toko" },
  { id: "populer", label: "Terpopuler" },
  { id: "murah", label: "Harga termurah" },
  { id: "mahal", label: "Harga termahal" },
];

/**
 * Galeri publik dengan pencarian & filter (kategori, brand, kondisi, harga) +
 * urutan. Semua di klien (maks. 200 item); filter disinkron ke URL (replaceState)
 * agar tautan hasil saringan bisa dibagikan. `ref` asal tautan tetap dipertahankan.
 */
export function GalleryBrowser({
  items,
  initial,
  keepRef,
}: {
  items: BrowserItem[];
  initial: GalleryFilters;
  keepRef: string | null;
}) {
  const [f, setF] = useState<GalleryFilters>(initial);
  const shown = useMemo(() => filterGallery(items, f), [items, f]);
  const facets = useMemo(() => galleryFacets(items, f), [items, f]);
  const active = activeFilterCount(f);
  const showFilters = items.length >= 4;
  // Visibilitas baris dari SELURUH galeri (tak bergantung filter aktif) → tata letak stabil.
  const base = useMemo(() => galleryFacets(items, EMPTY_FILTERS), [items]);
  const hasBothConditions = base.condition.every((c) => c.count > 0);
  const priceBands = facets.price.filter((p) => (base.price.find((b) => b.value === p.value)?.count ?? 0) > 0);

  function update(next: Partial<GalleryFilters>) {
    const merged = { ...f, ...next };
    setF(merged);
    try {
      window.history.replaceState(null, "", window.location.pathname + galleryQueryString(merged, { ref: keepRef }));
    } catch {
      /* abaikan — filter tetap jalan tanpa sinkron URL */
    }
  }
  const toggle = <K extends "category" | "brand" | "condition" | "price">(key: K, value: GalleryFilters[K]) =>
    update({ [key]: f[key] === value ? null : value } as Partial<GalleryFilters>);

  return (
    <>
      {showFilters && (
        <div className="mb-5 space-y-3 rounded-2xl border bg-card p-3 sm:p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-0 flex-[1_1_220px]">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={f.q}
                onChange={(e) => update({ q: e.target.value })}
                placeholder="Cari produk, mis. RTX 3060, SSD 1TB…"
                aria-label="Cari produk"
                className="h-10 w-full rounded-lg border bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
            <label className="flex flex-[0_1_200px] items-center gap-2 text-sm">
              <SlidersHorizontal className="size-4 shrink-0 text-muted-foreground" />
              <span className="sr-only">Urutkan</span>
              <select
                value={f.sort}
                onChange={(e) => update({ sort: e.target.value as GallerySort })}
                className="h-10 w-full rounded-lg border bg-background px-2 text-sm"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>{s.label}</option>
                ))}
              </select>
            </label>
          </div>

          {base.categories.length > 1 && (
            <ChipRow label="Kategori">
              {facets.categories.map((c) => (
                <Chip key={c.value} on={f.category?.toLowerCase() === c.value.toLowerCase()} count={c.count} onClick={() => toggle("category", c.value)}>
                  {c.value}
                </Chip>
              ))}
            </ChipRow>
          )}
          {base.brands.length > 1 && (
            <ChipRow label="Brand">
              {facets.brands.map((b) => (
                <Chip key={b.value} on={f.brand?.toLowerCase() === b.value.toLowerCase()} count={b.count} onClick={() => toggle("brand", b.value)}>
                  {b.value}
                </Chip>
              ))}
            </ChipRow>
          )}
          <div className="flex flex-wrap gap-x-6 gap-y-3">
            {hasBothConditions && (
              <ChipRow label="Kondisi">
                {facets.condition.map((c) => (
                  <Chip key={c.value} on={f.condition === c.value} count={c.count} onClick={() => toggle("condition", c.value)}>
                    {c.value === "baru" ? "Baru" : "Bekas / second"}
                  </Chip>
                ))}
              </ChipRow>
            )}
            {priceBands.length > 1 && (
              <ChipRow label="Harga">
                {priceBands.map((p) => (
                    <Chip key={p.value} on={f.price === p.value} count={p.count} onClick={() => toggle("price", p.value)}>
                      {p.label}
                    </Chip>
                  ))}
              </ChipRow>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t pt-2 text-xs text-muted-foreground">
            <span>
              Menampilkan <b className="font-mono text-foreground">{shown.length}</b> dari {items.length} produk
            </span>
            {active > 0 && (
              <button
                type="button"
                onClick={() => update({ ...EMPTY_FILTERS, sort: f.sort })}
                className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
              >
                <X className="size-3.5" /> Hapus filter ({active})
              </button>
            )}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-xl border bg-card p-10 text-center text-sm text-muted-foreground">
          Tidak ada produk yang cocok.{" "}
          <button type="button" onClick={() => update({ ...EMPTY_FILTERS, sort: f.sort })} className="font-semibold text-primary hover:underline">
            Hapus filter
          </button>{" "}
          atau tanyakan langsung ke kami via WhatsApp — barang yang Anda cari mungkin tersedia.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((it) => {
            const meta = [it.category, it.brand].filter(Boolean).join(" · ");
            const showUsed = it.condition === "bekas" && !/bekas|second/i.test(it.label ?? "");
            return (
              <div key={it.id} className="flex flex-col overflow-hidden rounded-2xl border bg-card elevate">
                <div className="relative aspect-[4/3] bg-muted/40">
                  {it.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={it.photo} alt={it.title} className="size-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex size-full items-center justify-center text-sm text-muted-foreground">Tanpa foto</div>
                  )}
                  {(it.label || showUsed) && (
                    <span className="absolute left-3 top-3 flex gap-1.5">
                      {it.label && (
                        <span className="rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
                          {it.label}
                        </span>
                      )}
                      {showUsed && (
                        <span className="rounded-full bg-black/70 px-3 py-1 text-xs font-semibold text-white">Bekas</span>
                      )}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  {meta && <p className="text-[11px] font-semibold uppercase tracking-wide text-primary">{meta}</p>}
                  <h2 className="font-semibold leading-snug">{it.title}</h2>
                  {it.spec && <p className="whitespace-pre-line text-sm text-muted-foreground">{it.spec}</p>}
                  <p className="mt-auto pt-1 font-mono text-lg font-bold tabular-nums text-primary">
                    {it.price > 0 ? formatRupiah(it.price) : "Hubungi untuk harga"}
                  </p>
                  <div className="mt-1 flex flex-col gap-2">
                    {it.waHref && <ChatWaButton itemId={it.id} href={it.waHref} />}
                    <ShareButton title={it.title} price={it.price} spec={it.spec} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

function ChipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="w-16 shrink-0 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-0.5 [scrollbar-width:thin]">{children}</div>
    </div>
  );
}

function Chip({
  on,
  count,
  onClick,
  children,
}: {
  on: boolean;
  count: number;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      disabled={!on && count === 0}
      className={cn(
        "inline-flex h-8 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-xs font-medium transition-colors disabled:opacity-40",
        on ? "border-primary bg-primary text-primary-foreground" : "bg-background hover:border-primary/50 hover:bg-accent",
      )}
    >
      {children}
      <span className={cn("font-mono text-[10px]", on ? "opacity-80" : "text-muted-foreground")}>{count}</span>
    </button>
  );
}
