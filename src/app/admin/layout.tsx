import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldAlert } from "lucide-react";
import { requireSuperAdmin } from "@/lib/auth/guard";
import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { AdminNav } from "./admin-nav";

export const metadata: Metadata = { title: "Dashboard Admin" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const me = await requireSuperAdmin();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-header text-header-foreground">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-3 px-4">
          <Logo size={30} />
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-sm font-semibold leading-tight">
              <ShieldAlert className="size-4 text-amber-400" /> Admin Platform
            </p>
            <p className="truncate text-xs text-header-foreground/70">{me.email}</p>
          </div>
          <div className="flex-1" />
          <Link
            href="/dashboard"
            className="hidden items-center gap-1.5 rounded-lg border border-header-foreground/15 px-3 py-1.5 text-sm hover:bg-header-foreground/10 sm:flex"
          >
            <ArrowLeft className="size-4" /> Kembali ke Toko
          </Link>
          <ThemeToggle />
        </div>
        <div className="mx-auto max-w-6xl px-4">
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl p-4 md:p-6">{children}</main>
    </div>
  );
}
