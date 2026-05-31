import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { listCategories, listUnits } from "@/server/inventory/service";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AddCategoryForm, AddUnitForm } from "./master-client";

export const metadata: Metadata = { title: "Kategori & Satuan" };

export default async function MasterDataPage() {
  const { tenantId } = await getAuthContext();
  const [categories, units] = await Promise.all([
    listCategories(tenantId),
    listUnits(tenantId),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/inventory" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">Kategori & Satuan</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Kategori</CardTitle>
          <CardDescription>Pengelompokan produk (mis. Laptop, Komponen).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddCategoryForm />
          {categories.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada kategori.</p>
          ) : (
            <ul className="divide-y rounded-md border">
              {categories.map((c) => (
                <li key={c.id} className="flex items-center justify-between p-3 text-sm">
                  <span className="font-medium">{c.name}</span>
                  {c.description && (
                    <span className="text-muted-foreground">{c.description}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Satuan</CardTitle>
          <CardDescription>Satuan barang (mis. Pcs, Unit, Set).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <AddUnitForm />
          <ul className="divide-y rounded-md border">
            {units.map((u) => (
              <li key={u.id} className="flex items-center justify-between p-3 text-sm">
                <span className="font-medium">{u.name}</span>
                {u.symbol && <span className="text-muted-foreground">{u.symbol}</span>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
