import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Pencil, Barcode, Receipt } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { getUsedItem, saleNumberFor } from "@/server/used-items/service";
import { daysInStock, gradeText, sourceLabel, usedMargin, warrantyText } from "@/lib/used-item";
import { formatRupiah } from "@/lib/utils";
import { formatLocalDate, formatLocalDateTime } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { USED_GRADE_VARIANT, USED_STATUS_META } from "../status-config";
import { UsedItemActions } from "./used-item-actions";

export const metadata: Metadata = { title: "Detail Barang Bekas" };

export default async function UsedItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!can(user.role, "inventory.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const it = await getUsedItem(user.tenantId, id);
  if (!it) notFound();
  const sale = await saleNumberFor(user.tenantId, it.saleId);
  const st = USED_STATUS_META[it.status];
  const soldPrice = it.soldPrice ?? it.sellPrice;
  const m = usedMargin(it.costPrice, it.status === "SOLD" ? soldPrice : it.sellPrice);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: "Jenis", value: it.category },
    { label: "Nama / tipe", value: <span className="font-medium">{it.name}</span> },
    { label: "No. seri", value: it.serialNumber ? <span className="font-mono">{it.serialNumber}</span> : "—" },
    { label: "Spesifikasi", value: it.specs || "—" },
    { label: "Kondisi", value: <Badge variant={USED_GRADE_VARIANT[it.grade]}>{gradeText(it.grade)}</Badge> },
    { label: "Keterangan kondisi", value: it.condition || "—" },
    { label: "Kelengkapan", value: it.completeness || "—" },
    { label: "Garansi toko", value: warrantyText(it.warrantyDays) },
    {
      label: "Asal",
      value: [sourceLabel(it.source), it.sourceName, it.sourcePhone].filter(Boolean).join(" · "),
    },
    {
      label: "Tanggal masuk",
      value: `${formatLocalDate(it.acquiredAt, { dateStyle: "long" })}${
        it.status === "AVAILABLE" ? ` · ${daysInStock(it.acquiredAt)} hari di toko` : ""
      }`,
    },
    ...(it.note ? [{ label: "Catatan internal", value: it.note }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/used-items" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="flex flex-wrap items-center gap-2 text-2xl font-bold tracking-tight">
            <span className="font-mono">{it.number}</span>
            <Badge variant={st.variant}>{st.label}</Badge>
          </h1>
          <p className="truncate text-muted-foreground">
            {it.category} {it.name}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/used-items/${it.id}/label`} className={buttonVariants({ variant: "outline", size: "sm" })}>
            <Barcode /> Label
          </Link>
          <Link href={`/used-items/${it.id}/edit`} className={buttonVariants({ size: "sm" })}>
            <Pencil /> Ubah
          </Link>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Harga</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-xs text-muted-foreground">Harga beli / modal</p>
            <p className="font-mono text-lg font-bold tabular-nums">{formatRupiah(it.costPrice)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{it.status === "SOLD" ? "Terjual (bersih)" : "Harga jual"}</p>
            <p className="font-mono text-lg font-bold tabular-nums text-primary">
              {formatRupiah(it.status === "SOLD" ? soldPrice : it.sellPrice)}
            </p>
            {it.status === "SOLD" && soldPrice !== it.sellPrice && (
              <p className="text-xs text-muted-foreground">harga daftar {formatRupiah(it.sellPrice)}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{it.status === "SOLD" ? "Laba kotor" : "Margin"}</p>
            <p className={`font-mono text-lg font-bold tabular-nums ${m.margin < 0 ? "text-destructive" : "text-success"}`}>
              {formatRupiah(m.margin)}
            </p>
            {m.pct !== null && <p className="text-xs text-muted-foreground">{m.pct}% dari harga jual</p>}
          </div>
        </CardContent>
        {it.status === "SOLD" && (
          <CardContent className="border-t pt-4 text-sm">
            Terjual {it.statusAt ? formatLocalDateTime(it.statusAt, { dateStyle: "medium", timeStyle: "short" }) : ""}
            {sale && (
              <>
                {" "}
                lewat kasir{" "}
                <Link href={`/sales/${it.saleId}`} className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                  <Receipt className="size-3.5" /> {sale.number}
                </Link>
              </>
            )}
            . Untuk membatalkan, lakukan void/retur pada penjualannya.
          </CardContent>
        )}
      </Card>

      <Card className="divide-y">
        {rows.map((r) => (
          <div key={r.label} className="grid grid-cols-1 gap-1 px-4 py-2.5 text-sm sm:grid-cols-[180px_1fr] sm:gap-4">
            <span className="text-muted-foreground">{r.label}</span>
            <span className="whitespace-pre-wrap">{r.value}</span>
          </div>
        ))}
      </Card>

      <UsedItemActions
        id={it.id}
        name={`${it.category} ${it.name}`}
        status={it.status}
        gallery={it.galleryItem ? { active: it.galleryItem.isActive } : null}
      />
    </div>
  );
}
