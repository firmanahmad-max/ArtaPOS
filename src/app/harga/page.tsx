import type { Metadata } from "next";
import Link from "next/link";
import { Check, ArrowRight, Sparkles, KeyRound, ChevronDown } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { cn, formatRupiah } from "@/lib/utils";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { db } from "@/lib/db";
import { PRICING_TIERS, PRICING_INCLUDES, TRIAL_DAYS } from "@/lib/pricing";

export const metadata: Metadata = {
  title: "Harga",
  description: `Harga langganan ${APP_NAME} — produk yang sama untuk semua toko, makin awal bergabung makin murah.`,
};

const FAQ = [
  {
    q: "Apa bedanya ketiga paket ini?",
    a: "Hanya harganya. Semua paket mendapat aplikasi penuh dengan fitur yang sama tanpa batas — yang membedakan cuma waktu Anda bergabung. Makin awal, makin murah, dan harga itu dikunci selama langganan Anda tidak putus.",
  },
  {
    q: "Apakah harga saya akan naik nanti?",
    a: "Tidak. Harga yang Anda dapat saat mendaftar dikunci selama langganan berjalan. Kenaikan harga publik di masa depan tidak memengaruhi pelanggan lama.",
  },
  {
    q: "Bagaimana cara membayar?",
    a: "Langganan dibayar di muka (6 bulan atau tahunan untuk tarif Pendiri & Early). Setelah pembayaran, Anda menerima kode aktivasi yang dimasukkan di Pengaturan → Lisensi untuk mengaktifkan/memperpanjang masa berlaku.",
  },
  {
    q: "Bisa dicoba dulu?",
    a: `Bisa. Coba gratis ${TRIAL_DAYS} hari dengan fitur penuh, tanpa kartu. Setelah cocok, aktifkan langganan lewat kode.`,
  },
  {
    q: "Bagaimana kalau internet mati?",
    a: "ArtaPOS tetap bisa melayani penjualan saat offline; data tersimpan di perangkat dan otomatis tersinkron saat internet kembali.",
  },
];

export default async function HargaPage() {
  // Sisa slot kelangkaan dibaca dari kuota PromoCode (bila kodenya sudah dibuat).
  // Degradasi anggun: bila DB bermasalah / kode belum ada → tampil kuota penuh.
  const codes = PRICING_TIERS.map((t) => t.promoCode).filter(Boolean) as string[];
  let remaining: Record<string, number | null> = {};
  try {
    if (codes.length) {
      const rows = await db.promoCode.findMany({
        where: { code: { in: codes } },
        select: { code: true, maxRedemptions: true, redemptionsUsed: true },
      });
      const byCode = new Map(rows.map((r) => [r.code, r]));
      for (const t of PRICING_TIERS) {
        if (!t.promoCode || t.quota == null) continue;
        const row = byCode.get(t.promoCode);
        remaining[t.id] = row?.maxRedemptions != null
          ? Math.max(0, row.maxRedemptions - row.redemptionsUsed)
          : t.quota; // kode belum dibuat → anggap penuh tersedia
      }
    }
  } catch {
    remaining = {};
  }
  const slotsLeft = (id: string, quota?: number) =>
    remaining[id] ?? quota ?? null;

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <Link href="/about" className="flex items-center gap-2">
          <Logo size={36} />
          <div className="leading-tight">
            <p className="font-semibold">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/login" className={buttonVariants({ size: "sm" })}>
            Masuk <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-12 sm:px-6">
        {/* Hero */}
        <section className="text-center">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-primary">Harga</p>
          <h1 className="mt-2 text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            Satu produk. Makin awal bergabung, makin murah.
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Semua paket mendapat aplikasi penuh dengan fitur yang sama — tanpa batas pengguna maupun transaksi.
            Yang membedakan hanya harga, dan harga itu <strong className="text-foreground">dikunci</strong> selama langganan Anda aktif.
          </p>
        </section>

        {/* Pricing cards */}
        <section className="grid gap-5 lg:grid-cols-3">
          {PRICING_TIERS.map((t) => {
            const left = t.quota != null ? slotsLeft(t.id, t.quota) : null;
            const full = left != null && left <= 0;
            return (
              <div
                key={t.id}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-card p-6",
                  t.highlight ? "border-primary/40 ring-2 ring-primary/30 elevate-lg" : "elevate",
                )}
              >
                {t.badge && (
                  <span className="absolute -top-3 left-6 inline-flex items-center gap-1 rounded-full gradient-brand px-3 py-1 text-xs font-semibold text-primary-foreground shadow-brand">
                    <Sparkles className="size-3.5" /> {t.badge}
                  </span>
                )}
                <div className="mb-1 flex items-start justify-between gap-2">
                  <h2 className="text-lg font-bold">{t.name}</h2>
                  {t.quota != null && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums",
                        full
                          ? "bg-muted text-muted-foreground"
                          : "bg-amber-500/15 text-amber-700 dark:text-amber-400",
                      )}
                    >
                      {full ? "Kuota penuh" : `Tersisa ${left}/${t.quota}`}
                    </span>
                  )}
                </div>
                <p className="min-h-[40px] text-sm text-muted-foreground">{t.tagline}</p>

                <div className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-mono text-4xl font-bold tabular-nums text-foreground">{formatRupiah(t.monthly)}</span>
                  <span className="text-sm text-muted-foreground">/bulan</span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  atau <span className="font-medium text-foreground">{formatRupiah(t.annual)}</span>/tahun
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{t.billNote}</p>

                <Link
                  href="/login"
                  className={cn(
                    buttonVariants({ variant: t.highlight ? "default" : "outline" }),
                    "mt-5 w-full",
                  )}
                >
                  {full ? "Gabung daftar tunggu" : "Pilih paket ini"}
                </Link>
                {t.id === "pendiri" && (
                  <p className="mt-2 text-center text-xs text-muted-foreground">Harga dikunci — tidak naik selama aktif</p>
                )}
              </div>
            );
          })}
        </section>

        {/* Included features */}
        <section className="rounded-2xl border bg-card p-6 elevate sm:p-8">
          <h2 className="text-center text-lg font-bold">Setiap paket sudah termasuk</h2>
          <p className="mt-1 text-center text-sm text-muted-foreground">
            Tidak ada fitur yang dikunci di balik harga lebih mahal.
          </p>
          <ul className="mx-auto mt-6 grid max-w-3xl gap-x-8 gap-y-3 sm:grid-cols-2">
            {PRICING_INCLUDES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-primary/12 text-primary">
                  <Check className="size-3.5" />
                </span>
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* CTA */}
        <section className="flex flex-col items-center gap-3 rounded-2xl gradient-arta p-8 text-center text-white elevate-lg">
          <h2 className="text-2xl font-bold">Coba gratis {TRIAL_DAYS} hari</h2>
          <p className="max-w-xl text-white/80">
            Pakai semua fitur tanpa kartu. Sudah punya kode aktivasi? Masukkan di Pengaturan → Lisensi.
          </p>
          <div className="mt-2 flex flex-wrap justify-center gap-3">
            <Link href="/login" className={cn(buttonVariants(), "bg-white text-[#3b1d7e] hover:bg-white/90")}>
              Mulai sekarang <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/settings"
              className={cn(buttonVariants({ variant: "outline" }), "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white")}
            >
              <KeyRound className="size-4" /> Aktifkan kode
            </Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="mx-auto max-w-3xl">
          <h2 className="mb-4 text-center text-lg font-bold">Pertanyaan umum</h2>
          <div className="space-y-2">
            {FAQ.map((item) => (
              <details key={item.q} className="group rounded-lg border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-3 p-4 font-medium [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t p-4 text-sm text-muted-foreground">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 pt-2 text-sm text-muted-foreground">
          <Link href="/about" className="hover:text-foreground hover:underline">Tentang</Link>
          <span>·</span>
          <Link href="/about#panduan" className="hover:text-foreground hover:underline">Panduan</Link>
          <span>·</span>
          <Link href="/disclaimer" className="hover:text-foreground hover:underline">Disclaimer</Link>
          <span>·</span>
          <Link href="/terms" className="hover:text-foreground hover:underline">Ketentuan</Link>
        </footer>
      </main>
    </div>
  );
}
