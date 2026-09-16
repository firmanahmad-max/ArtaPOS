"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Boxes, Wrench, Menu } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pos", label: "Kasir", icon: ShoppingCart },
  { href: "/inventory", label: "Stok", icon: Boxes },
  { href: "/service", label: "Servis", icon: Wrench },
];

/**
 * Tab bar bawah (khusus mobile, <md). 5 tujuan: Dashboard · Kasir · Stok ·
 * Servis · Menu (buka drawer nav lengkap). Aktif = primary. Target sentuh ≥44px.
 */
export function BottomTabBar({ onMenu }: { onMenu: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex h-[62px] items-stretch border-t bg-card md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {TABS.map((t) => {
        const Icon = t.icon;
        const active = isActive(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 text-[9.5px] font-medium transition-colors",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-[21px]" />
            {t.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMenu}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-[9.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <Menu className="size-[21px]" />
        Menu
      </button>
    </nav>
  );
}
