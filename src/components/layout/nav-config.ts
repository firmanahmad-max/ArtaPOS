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

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, enabled: true },
  { href: "/pos", label: "Penjualan (POS)", icon: ShoppingCart, permission: "pos.use", enabled: true },
  { href: "/sales", label: "Riwayat Jual", icon: Receipt, permission: "reports.view", enabled: true },
  { href: "/shift", label: "Shift Kasir", icon: Clock, permission: "pos.use", enabled: true },
  { href: "/receivables", label: "Piutang", icon: Coins, permission: "reports.view", enabled: true },
  { href: "/inventory", label: "Inventory", icon: Boxes, permission: "inventory.manage", enabled: true },
  { href: "/warranty", label: "Garansi", icon: ShieldCheck, permission: "inventory.manage", enabled: true },
  { href: "/suppliers", label: "Supplier", icon: Building2, permission: "purchasing.manage", enabled: true },
  { href: "/customers", label: "Pelanggan", icon: UserRound, permission: "pos.use", enabled: true },
  { href: "/purchasing", label: "Pembelian", icon: Truck, permission: "purchasing.manage", enabled: true },
  { href: "/payables", label: "Utang", icon: HandCoins, permission: "purchasing.manage", enabled: true },
  { href: "/service", label: "Jasa Servis", icon: Wrench, permission: "service.manage", enabled: true },
  { href: "/pc-build", label: "Rakit PC", icon: Cpu, permission: "pcbuild.manage", enabled: true },
  { href: "/finance", label: "Keuangan", icon: Wallet, permission: "finance.view", enabled: true },
  { href: "/reports", label: "Laporan", icon: FileBarChart, permission: "reports.view", enabled: true },
  { href: "/users", label: "Pengguna", icon: Users, permission: "users.manage", enabled: true },
  { href: "/settings", label: "Pengaturan", icon: Settings, permission: "settings.manage", enabled: true },
];
