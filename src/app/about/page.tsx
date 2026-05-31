import type { Metadata } from "next";
import Link from "next/link";
import {
  ShoppingCart,
  Truck,
  Boxes,
  HandCoins,
  Wrench,
  Cpu,
  BarChart3,
  QrCode,
  Bluetooth,
  MessageCircle,
  Building2,
  MonitorSmartphone,
  Store,
  ArrowRight,
} from "lucide-react";
import {
  APP_NAME,
  APP_TAGLINE,
  APP_PUBLISHER,
  APP_PUBLISHER_URL,
  APP_DEVELOPER,
  APP_DEVELOPER_HANDLE,
  APP_DEVELOPER_PORTFOLIO,
} from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tentang",
  description: `Tentang ${APP_NAME} — aplikasi manajemen toko komputer. ${APP_TAGLINE}.`,
};

const FEATURES = [
  { icon: ShoppingCart, label: "Point of Sale (POS)" },
  { icon: Truck, label: "Pembelian & Supplier" },
  { icon: Boxes, label: "Inventory & Stock Management" },
  { icon: HandCoins, label: "Utang & Piutang" },
  { icon: Wrench, label: "Manajemen Jasa Servis" },
  { icon: Cpu, label: "Modul Rakit PC (PC Builder)" },
  { icon: BarChart3, label: "Laporan Keuangan & Analitik" },
  { icon: QrCode, label: "Scan Barcode" },
  { icon: Bluetooth, label: "Cetak Struk Bluetooth" },
  { icon: MessageCircle, label: "Kirim Laporan via WhatsApp" },
  { icon: Building2, label: "Multi-Tenant (SaaS Ready)" },
  { icon: MonitorSmartphone, label: "Responsive (Desktop, Tablet, Mobile)" },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Buka Aplikasi <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-10 px-4 py-10 sm:px-6">
        {/* Hero */}
        <section className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Tentang {APP_NAME}</h1>
          <p className="text-lg text-muted-foreground">
            <span className="font-semibold text-foreground">{APP_NAME}</span> adalah aplikasi manajemen
            toko komputer yang dirancang khusus untuk kebutuhan bisnis teknologi di Indonesia.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Dengan menggabungkan berbagai proses operasional dalam satu platform, {APP_NAME} membantu
            pemilik toko mengelola penjualan, pembelian, inventaris, utang-piutang, layanan servis,
            perakitan PC, hingga laporan keuangan secara lebih efisien, akurat, dan terintegrasi.
          </p>
          <p className="leading-relaxed text-muted-foreground">
            Dibangun dengan pendekatan modern dan scalable, {APP_NAME} mendukung sistem multi-tenant
            sehingga siap digunakan sebagai layanan SaaS untuk banyak toko sekaligus. Antarmuka yang
            responsif memungkinkan akses yang nyaman melalui desktop, tablet, maupun smartphone,
            dilengkapi tema terang dan gelap untuk pengalaman pengguna yang lebih fleksibel.
          </p>
        </section>

        {/* Features */}
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Fitur Unggulan</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="flex items-center gap-3 rounded-lg border bg-card p-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                    <Icon className="size-5" />
                  </div>
                  <span className="text-sm font-medium">{f.label}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tagline */}
        <section className="rounded-xl border bg-primary/5 p-6 text-center">
          <p className="leading-relaxed text-muted-foreground">
            {APP_NAME} hadir untuk membantu toko komputer Indonesia beroperasi lebih cerdas, lebih
            efisien, dan lebih siap menghadapi transformasi digital.
          </p>
          <p className="mt-3 text-lg font-bold">{APP_NAME} — {APP_TAGLINE}.</p>
        </section>

        {/* Credits */}
        <section className="space-y-1 border-t pt-6 text-center text-sm text-muted-foreground">
          <p>
            Powered by{" "}
            <a href={APP_PUBLISHER_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
              {APP_PUBLISHER}
            </a>
          </p>
          <p>
            Developer: <span className="font-medium text-foreground">{APP_DEVELOPER}</span> · {APP_DEVELOPER_HANDLE}
          </p>
          <p>
            Portfolio:{" "}
            <a href={APP_DEVELOPER_PORTFOLIO} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              {APP_DEVELOPER_PORTFOLIO.replace(/^https?:\/\//, "")}
            </a>
          </p>
          <p className="pt-2">
            <Link href="/disclaimer" className="text-primary hover:underline">Disclaimer & Ketentuan Penggunaan</Link>
          </p>
        </section>
      </main>
    </div>
  );
}
