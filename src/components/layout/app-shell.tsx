"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Store, LogOut, WifiOff } from "lucide-react";
import type { UserRole } from "@/generated/prisma/enums";
import { NAV_ITEMS } from "@/components/layout/nav-config";
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
}

export function AppShell({
  user,
  children,
}: {
  user: ShellUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const online = useOnlineStatus();

  const items = NAV_ITEMS.filter(
    (item) => !item.permission || can(user.role, item.permission),
  );

  const SidebarContent = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2 border-b px-4">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Store className="size-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{user.storeName}</p>
          <p className="text-xs text-muted-foreground">{APP_NAME}</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          if (!item.enabled) {
            return (
              <div
                key={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground/60"
                title="Segera tersedia"
              >
                <Icon className="size-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium">
                  Segera
                </span>
              </div>
            );
          }
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-3">
        <div className="mb-2 px-1">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">
            {ROLE_LABELS[user.role]} · {user.email}
          </p>
        </div>
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
        <Link
          href="/about"
          onClick={() => setMobileOpen(false)}
          className="mt-2 block text-center text-xs text-muted-foreground hover:text-foreground hover:underline"
        >
          Tentang {APP_NAME}
        </Link>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
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
        <header className="flex h-16 items-center gap-2 border-b bg-card px-4">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Buka menu"
          >
            <Menu className="size-5" />
          </Button>
          <div className="flex-1" />
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
