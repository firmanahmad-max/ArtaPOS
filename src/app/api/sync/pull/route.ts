import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";

/**
 * Endpoint SINKRONISASI (pull) — katalog untuk cache lokal perangkat kasir
 * (agar POS bisa mencari produk & pelanggan saat offline).
 *
 * `?since=<ISO>` → hanya yang berubah sejak checkpoint (delta). Tanpa `since` →
 * seluruh katalog (initial load). Balasan menyertakan `checkpoint` (waktu server)
 * untuk dipakai pada pull berikutnya. Ter-scope tenant dari session.
 */
export async function GET(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = await db.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId, isActive: true },
    select: { role: true, tenant: { select: { isActive: true } } },
  });
  if (!user || !user.tenant.isActive) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user.role, "pos.use")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const tenantId = session.tenantId;
  const sinceRaw = new URL(req.url).searchParams.get("since");
  const since = sinceRaw ? new Date(sinceRaw) : null;
  const changedSince = since && !Number.isNaN(since.getTime()) ? { updatedAt: { gt: since } } : {};
  const checkpoint = new Date().toISOString();

  const [products, customers] = await Promise.all([
    db.product.findMany({
      where: { tenantId, isActive: true, ...changedSince },
      select: {
        id: true, name: true, sku: true, barcode: true, sellPrice: true,
        costPrice: true, stock: true, minStock: true, updatedAt: true,
        unit: { select: { symbol: true } },
      },
      orderBy: { name: "asc" },
      take: 5000,
    }),
    db.customer.findMany({
      where: { tenantId, isActive: true, ...changedSince },
      select: { id: true, name: true, phone: true, points: true, updatedAt: true },
      orderBy: { name: "asc" },
      take: 5000,
    }),
  ]);

  return NextResponse.json({
    checkpoint,
    products: products.map((p) => ({
      id: p.id, name: p.name, sku: p.sku, barcode: p.barcode, sellPrice: p.sellPrice,
      costPrice: p.costPrice, stock: p.stock, minStock: p.minStock,
      unit: p.unit?.symbol ?? null, updatedAt: p.updatedAt.toISOString(),
    })),
    customers: customers.map((c) => ({
      id: c.id, name: c.name, phone: c.phone, points: c.points, updatedAt: c.updatedAt.toISOString(),
    })),
  });
}
