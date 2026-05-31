import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { listOpnames } from "@/server/opname/service";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { StartOpnameButton } from "./start-button";

export const metadata: Metadata = { title: "Stok Opname" };

const STATUS: Record<string, { label: string; variant: "success" | "warning" | "muted" }> = {
  DRAFT: { label: "Draft", variant: "warning" },
  COMPLETED: { label: "Selesai", variant: "success" },
  CANCELLED: { label: "Dibatalkan", variant: "muted" },
};

export default async function OpnamePage() {
  const { tenantId } = await getAuthContext();
  const opnames = await listOpnames(tenantId);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
            <ArrowLeft />
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Stok Opname</h1>
            <p className="text-muted-foreground">Penghitungan fisik & koreksi stok.</p>
          </div>
        </div>
        <StartOpnameButton />
      </div>

      {opnames.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-12 text-center">
          <ClipboardList className="size-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Belum ada sesi opname. Klik &quot;Mulai Opname Baru&quot; untuk menghitung stok fisik.
          </p>
        </Card>
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Tanggal</th>
                <th className="p-3 font-medium">Status</th>
                <th className="p-3 text-center font-medium">Item</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {opnames.map((o) => {
                const s = STATUS[o.status] ?? STATUS.DRAFT;
                return (
                  <tr key={o.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3">
                      {new Date(o.createdAt).toLocaleString("id-ID", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </td>
                    <td className="p-3">
                      <Badge variant={s.variant}>{s.label}</Badge>
                    </td>
                    <td className="p-3 text-center">{o._count.items}</td>
                    <td className="p-3 text-right">
                      <Link
                        href={`/inventory/opname/${o.id}`}
                        className={buttonVariants({ variant: "outline", size: "sm" })}
                      >
                        {o.status === "DRAFT" ? "Lanjutkan" : "Lihat"}
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
