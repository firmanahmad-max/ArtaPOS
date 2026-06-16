import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/dal";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Pencarian global ringkas (produk, pelanggan, penjualan) — ter-scope tenant. */
export async function GET(req: Request) {
  const user = await getCurrentUser();
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ products: [], customers: [], sales: [] });
  }

  const tenantId = user.tenantId;
  const contains = { contains: q, mode: "insensitive" as const };

  const [products, customers, sales] = await Promise.all([
    db.product.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ name: contains }, { sku: contains }, { barcode: contains }],
      },
      select: { id: true, name: true, sku: true, sellPrice: true, stock: true },
      take: 6,
    }),
    db.customer.findMany({
      where: {
        tenantId,
        isActive: true,
        OR: [{ name: contains }, { phone: contains }],
      },
      select: { id: true, name: true, phone: true },
      take: 5,
    }),
    db.sale.findMany({
      where: { tenantId, number: contains },
      select: { id: true, number: true, total: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  return NextResponse.json({ products, customers, sales });
}
