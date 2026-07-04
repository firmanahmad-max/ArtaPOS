"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, LogOut, WifiOff, Search, ShieldAlert } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { CommandPalette } from "@/components/layout/command-palette";
import type { UserRole } from "@/generated/prisma/enums";
import { NAV_GROUPS } from "@/components/layout/nav-config";
import { can } from "@/lib/rbac";
import { ROLE_LABELS } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { APP_NAME } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { logoutAction } from "@/server/auth/actions";

export interface ShellUser {
  name: string;
  email: string;
  role: UserRole;
  storeName: string;
  isSuperAdmin?: boolean;
}

export function AppShell({
  user,
  children,
  badges = {},
}: {
  user: ShellUser;
  children: React.ReactNode;
  badges?: Record<string, number>;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useOnlineStatus();

  const groups = NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter(
      (item) => !item.permission || can(user.role, item.permission),
    ),
  })).filter((group) => group.items.length > 0);

  const navTargets = groups.flatMap((g) =>
    g.items.map((i) => ({ href: i.href, label: i.label })),
  );

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b px-4">
        <Logo size={34} />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight">{user.storeName}</p>
          <p className="text-xs font-medium text-gradient-brand">{APP_NAME}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-3">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              {group.label}
            </p>
            {group.items.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              const Icon = item.icon;
              const badge = badges[item.href] ?? 0;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "group/nav relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                    active
                      ? "gradient-brand text-primary-foreground shadow-sm"
                      : "text-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="flex-1">{item.label}</span>
                  {badge > 0 && (
                    <span
                      className={cn(
                        "min-w-5 rounded-full px-1.5 py-0.5 text-center text-[10px] font-semibold tabular-nums",
                        active
                          ? "bg-white/25 text-white"
                          : "bg-destructive text-destructive-foreground",
                      )}
                      title="Produk perlu restock"
                    >
                      {badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 px-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]} · {user.email}
          </p>
        </div>
        {user.isSuperAdmin && (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="mb-2 flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm font-medium text-amber-700 transition-colors hover:bg-amber-500/20 dark:text-amber-400"
          >
            <ShieldAlert className="size-4" />
            Dashboard Admin
          </Link>
        )}
        <form action={logoutAction}>
          <Button
            type="submit"
            variant="outline"
            size="sm"
            className="w-full justify-start"
          >
            <LogOut className="size-4" />
            Keluar
          </Button>
        </form>
        <div className="mt-2 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Link href="/about" onClick={() => setMobileOpen(false)} className="hover:text-foreground hover:underline">
            Tentang {APP_NAME}
          </Link>
          <span>·</span>
          <Link href="/disclaimer" onClick={() => setMobileOpen(false)} className="hover:text-foreground hover:underline">
            Disclaimer
          </Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <CommandPalette navItems={navTargets} />
      {/* Sidebar desktop */}
      <aside className="hidden w-64 shrink-0 border-r bg-card md:block">
        {SidebarContent}
      </aside>

      {/* Drawer mobile */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 border-r bg-card shadow-lg">
            <button
              className="absolute right-2 top-3 rounded-md p-2 hover:bg-accent"
              onClick={() => setMobileOpen(false)}
              aria-label="Tutup menu"
            >
              <X className="size-5" />
            </button>
            {SidebarContent}
          </aside>
        </div>
      )}

      {/* Konten */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center gap-2 border-b bg-header px-4 text-header-foreground">
          <Button
            variant="ghost"
            size="icon"
            className="text-header-foreground hover:bg-header-foreground/10 md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </Button>
          {/* Brand tampil di header untuk mobile (desktop sudah ada di sidebar). */}
          <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
            <Logo size={30} />
            <span className="truncate font-semibold tracking-tight">{APP_NAME}</span>
          </Link>
          {/* Pencarian penuh (desktop). */}
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            className="hidden h-9 max-w-xs flex-1 items-center gap-2 rounded-lg border border-header-foreground/15 bg-header-foreground/5 px-3 text-sm text-header-foreground/70 transition-colors hover:bg-header-foreground/10 md:flex"
          >
            <Search className="size-4" />
            <span className="flex-1 text-left">Cari…</span>
            <kbd className="hidden rounded border border-header-foreground/20 bg-header-foreground/10 px-1.5 py-0.5 text-[10px] font-medium sm:inline">
              Ctrl K
            </kbd>
          </button>
          <div className="flex-1" />
          {/* Pencarian ringkas (mobile). */}
          <Button
            variant="ghost"
            size="icon"
            className="text-header-foreground hover:bg-header-foreground/10 md:hidden"
            onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
            aria-label="Cari"
          >
            <Search className="size-5" />
          </Button>
          <ThemeToggle />
        </header>
        {!online && (
          <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-400">
            <WifiOff className="size-4 shrink-0" />
            <span>Mode offline — Anda sedang tidak terhubung internet.</span>
          </div>
        )}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
