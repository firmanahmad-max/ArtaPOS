import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Pencil, QrCode, Boxes, Tags, ClipboardCheck, Upload } from "lucide-react";
import { getAuthContext } from "@/lib/auth/guard";
import { listProducts, ensureDefaultUnits } from "@/server/inventory/service";
import { formatRupiah } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchBox, DeleteProductButton } from "./inventory-client";

export const metadata: Metadata = { title: "Inventory" };

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { tenantId } = await getAuthContext();
  await ensureDefaultUnits(tenantId);
  const { q } = await searchParams;
  const products = await listProducts(tenantId, { search: q });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-muted-foreground">Kelola produk & stok toko Anda.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/inventory/import" className={buttonVariants({ variant: "outline" })}>
            <Upload /> Import
          </Link>
          <Link href="/inventory/opname" className={buttonVariants({ variant: "outline" })}>
            <ClipboardCheck /> Stok Opname
          </Link>
          <Link href="/inventory/master" className={buttonVariants({ variant: "outline" })}>
            <Tags /> Kategori & Satuan
          </Link>
          <Link href="/inventory/new" className={buttonVariants({})}>
            <Plus /> Tambah Produk
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchBox initial={q ?? ""} />
        <span className="text-sm text-muted-foreground">{products.length} produk</span>
      </div>

      {products.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title={q ? "Produk tidak ditemukan" : "Belum ada produk"}
          description={
            q
              ? "Coba kata kunci lain."
              : "Tambahkan produk pertama Anda untuk mulai mengelola stok."
          }
          action={
            !q && (
              <Link href="/inventory/new" className={buttonVariants({})}>
                <Plus /> Tambah Produk
              </Link>
            )
          }
        />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Produk</th>
                <th className="p-3 font-medium">Kategori</th>
                <th className="p-3 text-right font-medium">Harga Jual</th>
                <th className="p-3 text-center font-medium">Stok</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const out = p.stock <= 0;
                const low = !out && p.minStock > 0 && p.stock <= p.minStock;
                return (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/40">
                    <td className="p-3">
                      <div className="font-medium">{p.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {p.sku}
                        {p.barcode ? ` · ${p.barcode}` : ""}
                      </div>
                    </td>
                    <td className="p-3 text-muted-foreground">{p.category?.name ?? "—"}</td>
                    <td className="p-3 text-right font-medium">{formatRupiah(p.sellPrice)}</td>
                    <td className="p-3 text-center">
                      {out ? (
                        <Badge variant="destructive">Habis</Badge>
                      ) : low ? (
                        <Badge variant="warning">{p.stock} {p.unit?.symbol ?? ""} · menipis</Badge>
                      ) : (
                        <span>{p.stock} {p.unit?.symbol ?? ""}</span>
                      )}
                    </td>
                    <td className="p-3">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/inventory/${p.id}/label`}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          title="Cetak label barcode"
                        >
                          <QrCode />
                        </Link>
                        <Link
                          href={`/inventory/${p.id}/edit`}
                          className={buttonVariants({ variant: "ghost", size: "icon" })}
                          title="Edit produk"
                        >
                          <Pencil />
                        </Link>
                        <DeleteProductButton id={p.id} name={p.name} />
                      </div>
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
