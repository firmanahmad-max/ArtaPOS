import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Cpu } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listBuilds } from "@/server/pcbuild/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { BUILD_STATUS_META } from "./build-status";

export const metadata: Metadata = { title: "Rakit PC" };

export default async function PcBuildPage() {
  const user = await getCurrentUser();
  if (!can(user.role, "pcbuild.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const builds = await listBuilds(user.tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rakit PC</h1>
          <p className="text-muted-foreground">Rakitan PC dari komponen + jasa rakit.</p>
        </div>
        <Link href="/pc-build/new" className={buttonVariants({})}><Plus /> Rakitan Baru</Link>
      </div>

      {builds.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <Cpu className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Belum ada rakitan.</p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">No</th>
                <th className="p-3 font-medium">Nama</th>
                <th className="p-3 font-medium">Pelanggan</th>
                <th className="p-3 text-right font-medium">Total</th>
                <th className="p-3 text-center font-medium">Status</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {builds.map((b) => {
                const s = BUILD_STATUS_META[b.status];
                return (
                  <tr key={b.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3 font-medium">{b.number}</td>
                    <td className="p-3">{b.name}</td>
                    <td className="p-3 text-muted-foreground">{b.customerName || "—"}</td>
                    <td className="p-3 text-right font-medium">{formatRupiah(b.total)}</td>
                    <td className="p-3 text-center"><Badge variant={s.variant}>{s.label}</Badge></td>
                    <td className="p-3 text-right">
                      <Link href={`/pc-build/${b.id}`} className={buttonVariants({ variant: "outline", size: "sm" })}>Detail</Link>
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
