import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Wrench } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listTickets } from "@/server/service-jobs/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SERVICE_STATUS_META } from "./status-config";

export const metadata: Metadata = { title: "Jasa Servis" };

export default async function ServicePage() {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const tickets = await listTickets(user.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Jasa Servis</h1>
          <p className="text-muted-foreground">Tiket servis perangkat pelanggan.</p>
        </div>
        <div className="flex gap-2">
          <a href="/lacak" target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "outline" })}>
            Halaman Lacak Publik
          </a>
          <Link href="/service/new" className={buttonVariants({})}>
            <Plus /> Tiket Baru
          </Link>
        </div>
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="Belum ada tiket servis"
          description="Buat tiket pertama untuk mencatat servis perangkat pelanggan."
          action={
            <Link href="/service/new" className={buttonVariants({})}>
              <Plus /> Tiket Baru
            </Link>
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Pelanggan</th>
                <th className="p-3 font-medium">Perangkat</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => {
                const s = SERVICE_STATUS_META[t.status];
                return (
                  <tr key={t.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-medium">{t.number}</td>
                    <td className="p-3 text-muted-foreground">{t.customerName || "—"}</td>
                    <td className="p-3 text-muted-foreground">
                      {t.deviceType}
                      {t.deviceBrand ? ` · ${t.deviceBrand}` : ""}
                    </td>
                    <td className="p-3 text-right font-medium">{formatRupiah(t.total)}</td>
                    <td className="p-3 text-center"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="p-3 text-right">
                      <Link href={`/service/${t.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>
                        Detail
                      </Link>
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
