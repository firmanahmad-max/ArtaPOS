import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  ShoppingCart,
  Boxes,
  Truck,
  Wrench,
  Cpu,
  Wallet,
  HandCoins,
  FileBarChart,
  Users,
  Settings,
  Building2,
  UserRound,
  Receipt,
  Clock,
  Coins,
  ShieldCheck,
  Sparkles,
  PackageOpen,
} from "lucide-react";
import type { Permission } from "@/lib/rbac";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Izin minimal untuk melihat menu ini (undefined = semua role). */
  permission?: Permission;
  /** Sudah tersedia? (Fase berikutnya akan mengaktifkan satu per satu.) */
  enabled: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Utama",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
    ],
  },
  {
    label: "Penjualan",
    items: [
      { href: "/pos", label: "Penjualan (POS)", icon: ShoppingCart, permission: "pos.use", enabled: true },
      { href: "/sales", label: "Riwayat Jual", icon: Receipt, permission: "reports.view", enabled: true },
      { href: "/shift", label: "Shift Kasir", icon: Clock, permission: "pos.use", enabled: true },
      { href: "/receivables", label: "Piutang", icon: Coins, permission: "reports.view", enabled: true },
      { href: "/customers", label: "Pelanggan", icon: UserRound, permission: "pos.use", enabled: true },
    ],
  },
  {
    label: "Inventaris",
    items: [
      { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory.manage", enabled: true },
      { href: "/warranty", label: "Garansi", icon: ShieldCheck, permission: "inventory.manage", enabled: true },
      { href: "/rma", label: "Klaim RMA", icon: PackageOpen, permission: "inventory.manage", enabled: true },
    ],
  },
  {
    label: "Pembelian",
    items: [
      { href: "/suppliers", label: "Supplier", icon: Building2, permission: "purchasing.manage", enabled: true },
      { href: "/purchasing", label: "Pembelian", icon: Truck, permission: "purchasing.manage", enabled: true },
      { href: "/payables", label: "Utang", icon: HandCoins, permission: "purchasing.manage", enabled: true },
    ],
  },
  {
    label: "Layanan",
    items: [
      { href: "/service", label: "Jasa Servis", icon: Wrench, permission: "service.manage", enabled: true },
      { href: "/pc-build", label: "Rakit PC", icon: Cpu, permission: "pcbuild.manage", enabled: true },
    ],
  },
  {
    label: "Keuangan & Laporan",
    items: [
      { href: "/insights", label: "Tanya Arta", icon: Sparkles, permission: "reports.view", enabled: true },
      { href: "/finance", label: "Keuangan", icon: Wallet, permission: "finance.view", enabled: true },
      { href: "/reports", label: "Laporan", icon: FileBarChart, permission: "reports.view", enabled: true },
    ],
  },
  {
    label: "Administrasi",
    items: [
      { href: "/users", label: "Pengguna", icon: Users, permission: "users.manage", enabled: true },
      { href: "/settings", label: "Pengaturan", icon: Settings, permission: "settings.manage", enabled: true },
    ],
  },
];

/** Daftar datar (kompat). */
export const NAV_ITEMS: NavItem[] = NAV_GROUPS.flatMap((g) => g.items);
