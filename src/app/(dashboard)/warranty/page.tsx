import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, Shield, ShieldX, Award, PackageOpen } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listWarranties, listProductsForWarranty } from "@/server/warranty/service";
import { listCustomers } from "@/server/customers/service";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { RegisterWarrantyForm, WarrantySearch, ClaimButton } from "./warranty-client";
import { formatLocalDate } from "@/lib/timezone";

export const metadata: Metadata = { title: "Garansi" };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "destructive" | "muted" | "default" }> = {
  ACTIVE: { label: "Aktif", variant: "success" },
  EXPIRED: { label: "Kedaluwarsa", variant: "destructive" },
  CLAIMED: { label: "Diklaim", variant: "default" },
  VOID: { label: "Batal", variant: "muted" },
};

export default async function WarrantyPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { q } = await searchParams;
  const [units, products, customers] = await Promise.all([
    listWarranties(user.tenantId, q),
    listProductsForWarranty(user.tenantId),
    listCustomers(user.tenantId),
  ]);

  const activeCount = units.filter((u) => u.status === "ACTIVE").length;
  const expiredCount = units.filter((u) => u.status === "EXPIRED").length;
  const claimedCount = units.filter((u) => u.status === "CLAIMED").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Garansi & Nomor Seri</h1>
        <p className="text-muted-foreground">Daftarkan unit ber-nomor seri & lacak masa garansi.</p>
      </div>

      {/* Ringkasan KPI */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Shield} label="Total Unit" value={String(units.length)} hint="Terdaftar" tone="blue" />
        <StatCard icon={ShieldCheck} label="Garansi Aktif" value={String(activeCount)} hint="Masih berlaku" tone="emerald" />
        <StatCard icon={ShieldX} label="Kedaluwarsa" value={String(expiredCount)} hint="Masa habis" tone="rose" />
        <StatCard icon={Award} label="Diklaim" value={String(claimedCount)} hint="Sudah diklaim" tone="violet" />
      </div>

      <Card>
        <CardHeader><CardTitle>Daftarkan Garansi</CardTitle></CardHeader>
        <CardContent>
          <RegisterWarrantyForm
            products={products.map((p) => ({ id: p.id, name: p.name, warrantyMonths: p.warrantyMonths }))}
            customers={customers.map((c) => ({ id: c.id, name: c.name }))}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <WarrantySearch initial={q ?? ""} />
        <span className="text-sm text-muted-foreground">{units.length} unit</span>
      </div>

      {units.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ShieldCheck className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{q ? "Tidak ditemukan." : "Belum ada garansi terdaftar."}</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No. Seri</th>
                <th className="p-3 font-medium">Produk</th>
                <th className="p-3 font-medium">Pelanggan</th>
                <th className="p-3 font-medium">Garansi s/d</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {units.map((u) => {
                const s = STATUS[u.status] ?? STATUS.ACTIVE;
                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-mono text-xs">{u.serialNumber}</td>
                    <td className="p-3">{u.productName}</td>
                    <td className="p-3 text-muted-foreground">{u.customerName || "Umum"}</td>
                    <td className="p-3 text-muted-foreground">
                      {u.warrantyUntil
                        ? formatLocalDate(u.warrantyUntil, { dateStyle: "medium" })
                        : "—"}
                      {u.status === "ACTIVE" && u.daysLeft != null && (
                        <span className="ml-1 text-xs">({u.daysLeft} hari lagi)</span>
                      )}
                    </td>
                    <td className="p-3 text-center"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="p-3 text-right">
                      <span className="inline-flex items-center gap-1">
                        <Link
                          href={`/rma/new?wu=${u.id}`}
                          className={buttonVariants({ variant: "outline", size: "sm" })}
                          title="Kirim unit ini ke distributor (klaim RMA)"
                        >
                          <PackageOpen /> RMA
                        </Link>
                        {u.status !== "CLAIMED" && u.status !== "VOID" && <ClaimButton id={u.id} />}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
