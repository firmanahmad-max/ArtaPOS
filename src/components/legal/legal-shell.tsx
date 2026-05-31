import Link from "next/link";
import { Store, ArrowRight } from "lucide-react";
import { APP_NAME, APP_TAGLINE } from "@/lib/brand";
import { ThemeToggle } from "@/components/theme-toggle";
import { buttonVariants } from "@/components/ui/button";

const LEGAL_LINKS = [
  { href: "/about", label: "Tentang" },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Kebijakan Privasi" },
  { href: "/terms", label: "Syarat & Ketentuan" },
];

/** Kerangka halaman legal/info publik (header brand + footer tautan). */
export function LegalShell({
  title,
  lastUpdated,
  intro,
  children,
}: {
  title: string;
  lastUpdated?: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="flex items-center justify-between border-b bg-card px-4 py-3 sm:px-6">
        <Link href="/about" className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-5" />
          </div>
          <div className="leading-tight">
            <p className="font-semibold">{APP_NAME}</p>
            <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link href="/dashboard" className={buttonVariants({ size: "sm" })}>
            Buka Aplikasi <ArrowRight className="size-4" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:px-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
          {lastUpdated && <p className="text-sm text-muted-foreground">Terakhir diperbarui: {lastUpdated}</p>}
        </div>
        {intro && <div className="leading-relaxed text-muted-foreground">{intro}</div>}
        {children}

        <footer className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t pt-6 text-sm">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-primary hover:underline">
              {l.label}
            </Link>
          ))}
        </footer>
      </main>
    </div>
  );
}

export function LegalSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="space-y-2 leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function LegalBullets({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-5">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}
