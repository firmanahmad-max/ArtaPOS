import { verifySession } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Ekspor seluruh produk tenant ke CSV (cadangan / analisis). */
export async function GET() {
  const session = await verifySession();
  if (!can(session.role, "inventory.manage")) {
    return new Response("Forbidden", { status: 403 });
  }

  const products = await db.product.findMany({
    where: { tenantId: session.tenantId },
    include: { category: { select: { name: true } }, unit: { select: { symbol: true } } },
    orderBy: { name: "asc" },
  });

  const rows: (string | number | null)[][] = [
    ["sku", "barcode", "nama", "kategori", "satuan", "harga_beli", "harga_jual", "stok", "stok_min", "aktif"],
    ...products.map((p) => [
      p.sku,
      p.barcode,
      p.name,
      p.category?.name ?? "",
      p.unit?.symbol ?? "",
      p.costPrice,
      p.sellPrice,
      p.stock,
      p.minStock,
      p.isActive ? "ya" : "tidak",
    ]),
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="produk-${date}.csv"`,
    },
  });
}
