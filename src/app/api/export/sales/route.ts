import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { db } from "@/lib/db";
import { toCsv } from "@/lib/csv";

export const dynamic = "force-dynamic";

/** Ekspor riwayat penjualan tenant ke CSV. */
export async function GET() {
  const user = await getCurrentUser();
  if (!can(user.role, "reports.view")) {
    return new Response("Forbidden", { status: 403 });
  }

  const sales = await db.sale.findMany({
    where: { tenantId: user.tenantId },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });

  const rows: (string | number | null)[][] = [
    ["no_invoice", "tanggal", "pelanggan", "metode", "status_bayar", "status", "subtotal", "diskon", "total", "dibayar", "kembalian", "kasir"],
    ...sales.map((s) => [
      s.number,
      s.createdAt.toISOString(),
      s.customerName ?? "Umum",
      s.paymentMethod,
      s.paymentStatus,
      s.status,
      s.subtotal,
      s.discount,
      s.total,
      s.paid,
      s.change,
      s.cashierName ?? "",
    ]),
  ];

  const date = new Date().toISOString().slice(0, 10);
  return new Response(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="penjualan-${date}.csv"`,
    },
  });
}
