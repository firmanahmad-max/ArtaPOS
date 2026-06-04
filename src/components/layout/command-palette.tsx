"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Box,
  UserRound,
  Receipt,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatRupiah, cn } from "@/lib/utils";

interface NavTarget {
  href: string;
  label: string;
}

interface SearchResults {
  products: { id: string; name: string; sku: string; sellPrice: number; stock: number }[];
  customers: { id: string; name: string; phone: string | null }[];
  sales: { id: string; number: string; total: number }[];
}

interface FlatItem {
  key: string;
  label: string;
  hint?: string;
  href: string;
  group: string;
}

export function CommandPalette({ navItems }: { navItems: NavTarget[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults>({ products: [], customers: [], sales: [] });
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const openRef = useRef(false);

  const emptyResults = { products: [], customers: [], sales: [] };

  const doOpen = () => {
    setQuery("");
    setResults(emptyResults);
    setActive(0);
    setOpen(true);
  };

  // Toggle dengan Ctrl/Cmd+K + event eksternal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (openRef.current) setOpen(false);
        else doOpen();
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("open-command-palette", doOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("open-command-palette", doOpen);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sinkron ref + fokus input saat dibuka (tanpa setState).
  useEffect(() => {
    openRef.current = open;
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Pencarian (debounce) — hanya jalan saat query cukup panjang.
  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (q.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        if (res.ok) setResults(await res.json());
      } catch {
        /* abaikan */
      }
    }, 200);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query, open]);

  const items = useMemo<FlatItem[]>(() => {
    const q = query.trim().toLowerCase();
    const nav: FlatItem[] = navItems
      .filter((n) => !q || n.label.toLowerCase().includes(q))
      .slice(0, q ? 4 : navItems.length)
      .map((n) => ({ key: `nav-${n.href}`, label: n.label, href: n.href, group: "Menu" }));

    const products: FlatItem[] = results.products.map((p) => ({
      key: `p-${p.id}`,
      label: p.name,
      hint: `${p.sku} · ${formatRupiah(p.sellPrice)} · stok ${p.stock}`,
      href: `/inventory/${p.id}/edit`,
      group: "Produk",
    }));
    const customers: FlatItem[] = results.customers.map((c) => ({
      key: `c-${c.id}`,
      label: c.name,
      hint: c.phone ?? undefined,
      href: `/customers/${c.id}/edit`,
      group: "Pelanggan",
    }));
    const sales: FlatItem[] = results.sales.map((s) => ({
      key: `s-${s.id}`,
      label: s.number,
      hint: formatRupiah(s.total),
      href: `/sales/${s.id}`,
      group: "Penjualan",
    }));
    return [...nav, ...products, ...customers, ...sales];
  }, [navItems, results, query]);

  const go = (href: string) => {
    setOpen(false);
    router.push(href);
  };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const it = items[active];
      if (it) go(it.href);
    }
  };

  if (!open) return null;

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border bg-popover elevate-lg">
        <div className="flex items-center gap-2 border-b px-4">
          <Search className="size-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              const v = e.target.value;
              setQuery(v);
              setActive(0);
              if (v.trim().length < 2) setResults(emptyResults);
            }}
            onKeyDown={onInputKey}
            placeholder="Cari menu, produk, pelanggan, no. invoice…"
            className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>

        <div className="max-h-[55vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              {query.trim().length < 2 ? "Ketik untuk mencari…" : "Tidak ada hasil."}
            </p>
          ) : (
            items.map((it, i) => {
              const showHeader = it.group !== lastGroup;
              lastGroup = it.group;
              const Icon =
                it.group === "Produk"
                  ? Box
                  : it.group === "Pelanggan"
                    ? UserRound
                    : it.group === "Penjualan"
                      ? Receipt
                      : Search;
              return (
                <div key={it.key}>
                  {showHeader && (
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                      {it.group}
                    </p>
                  )}
                  <button
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(it.href)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm",
                      i === active ? "gradient-brand text-primary-foreground" : "hover:bg-accent",
                    )}
                  >
                    <Icon className="size-4 shrink-0 opacity-80" />
                    <span className="flex-1 truncate">{it.label}</span>
                    {it.hint && (
                      <span
                        className={cn(
                          "truncate text-xs",
                          i === active ? "text-primary-foreground/80" : "text-muted-foreground",
                        )}
                      >
                        {it.hint}
                      </span>
                    )}
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center gap-3 border-t px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <ArrowUp className="size-3" />
            <ArrowDown className="size-3" /> navigasi
          </span>
          <span className="flex items-center gap-1">
            <CornerDownLeft className="size-3" /> buka
          </span>
          <span className="ml-auto">Esc menutup</span>
        </div>
      </div>
    </div>
  );
}
