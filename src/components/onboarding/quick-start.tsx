"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Rocket,
  Settings,
  PackagePlus,
  Truck,
  ShoppingCart,
  Users,
  BookOpen,
  X,
  Check,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/lib/brand";
import { cn } from "@/lib/utils";

/**
 * Quick Start — panduan setup singkat yang tampil SEKALI saat aplikasi pertama
 * kali dibuka di perangkat ini (localStorage). Bisa dibuka lagi dari
 * Tentang → Panduan Penggunaan.
 */

const KEY = "artapos-quickstart-done";

const listeners = new Set<() => void>();
function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
function getSnapshot(): string {
  try {
    return localStorage.getItem(KEY) ? "done" : "show";
  } catch {
    return "done"; // tanpa localStorage: jangan ganggu
  }
}
// Server: jangan render (hindari flash/hydration mismatch).
function getServerSnapshot() {
  return "done";
}
function dismiss() {
  try {
    localStorage.setItem(KEY, "1");
  } catch {
    // abaikan
  }
  listeners.forEach((l) => l());
}

const STEPS = [
  {
    icon: Settings,
    title: "Lengkapi profil toko",
    desc: "Pengaturan → isi nama, alamat, telepon & logo — tampil di struk penjualan.",
    href: "/settings",
  },
  {
    icon: PackagePlus,
    title: "Tambah produk",
    desc: "Inventory → Tambah Produk (atau Import CSV untuk banyak sekaligus) beserta harga & stok awal.",
    href: "/inventory",
  },
  {
    icon: Truck,
    title: "Catat supplier & pembelian",
    desc: "Stok masuk lewat menu Pembelian — harga modal ter-update otomatis.",
    href: "/purchasing",
  },
  {
    icon: ShoppingCart,
    title: "Buka shift & mulai berjualan",
    desc: "Shift Kasir → Buka Shift, lalu transaksi di Penjualan (POS). Struk bisa dicetak/WhatsApp.",
    href: "/pos",
  },
  {
    icon: Users,
    title: "Tambah pengguna toko",
    desc: "Pengguna → buat akun Kasir/Teknisi dengan izin sesuai peran.",
    href: "/users",
  },
];

export function QuickStart() {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  if (state !== "show") return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative my-auto w-full max-w-lg rounded-2xl border bg-card shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          aria-label="Tutup panduan"
          className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <X className="size-5" />
        </button>

        <div className="space-y-1 p-6 pb-4 text-center">
          <div className="mx-auto mb-2 flex size-12 items-center justify-center rounded-2xl gradient-brand text-primary-foreground">
            <Rocket className="size-6" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">Selamat datang di {APP_NAME}! 👋</h2>
          <p className="text-sm text-muted-foreground">
            5 langkah singkat untuk menyiapkan toko Anda. Klik langkah untuk langsung menuju menunya.
          </p>
        </div>

        <ol className="space-y-2 px-6">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <li key={i}>
                <Link
                  href={s.href}
                  onClick={dismiss}
                  className="flex items-start gap-3 rounded-xl border p-3 transition-colors hover:border-primary/40 hover:bg-accent"
                >
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      <span className="mr-1 text-primary">{i + 1}.</span>
                      {s.title}
                    </p>
                    <p className="text-xs text-muted-foreground">{s.desc}</p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-2 p-6 pt-4 sm:flex-row">
          <Link
            href="/about#panduan"
            onClick={dismiss}
            className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
          >
            <BookOpen /> Panduan Lengkap
          </Link>
          <Button onClick={dismiss} className="flex-1">
            <Check /> Mengerti, Mulai Pakai
          </Button>
        </div>
        <p className="pb-4 text-center text-xs text-muted-foreground">
          Panduan ini hanya tampil sekali. Buka lagi kapan pun di Tentang {APP_NAME} → Panduan Penggunaan.
        </p>
      </div>
    </div>
  );
}
