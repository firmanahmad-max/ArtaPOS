import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { can } from "@/lib/rbac";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImportClient } from "./import-client";

export const metadata: Metadata = { title: "Import Produk" };

export default async function ImportProductsPage() {
  const ctx = await getAuthContext();
  if (!can(ctx.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Import Produk Massal</h1>
      </div>
      <Card>
        <CardHeader><CardTitle>Tempel Data CSV</CardTitle></CardHeader>
        <CardContent><ImportClient /></CardContent>
      </Card>
    </div>
  );
}
