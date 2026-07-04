"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Store, Ticket, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/admin", label: "Ringkasan", icon: LayoutDashboard, exact: true },
  { href: "/admin/tenants", label: "Toko & Lisensi", icon: Store },
  { href: "/admin/promo", label: "Kode Promo", icon: Ticket },
  { href: "/admin/access", label: "Akses Admin", icon: ShieldCheck },
];

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto">
      {TABS.map((t) => {
        const active = t.exact ? pathname === t.href : pathname.startsWith(t.href);
        const Icon = t.icon;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "border-header-foreground text-header-foreground"
                : "border-transparent text-header-foreground/60 hover:text-header-foreground",
            )}
          >
            <Icon className="size-4" /> {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
