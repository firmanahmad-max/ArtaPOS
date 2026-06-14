import "server-only";
import { db } from "@/lib/db";
import { localParts, startOfDay, formatLocalDate } from "@/lib/timezone";
import type { ExpenseInput, ReportPeriod } from "@/lib/validations/finance";

/** Service Keuangan — biaya + agregasi laporan. Ter-scope tenantId. */

// ── Biaya ───────────────────────────────────────────────────────────────—
export function listExpenses(tenantId: string, limit = 100) {
  return db.expense.findMany({ where: { tenantId }, orderBy: { date: "desc" }, take: limit });
}

export function createExpense(tenantId: string, userId: string, input: ExpenseInput) {
  return db.expense.create({
    data: {
      tenantId,
      category: input.category,
      description: input.description || null,
      amount: input.amount,
      date: input.date ? new Date(input.date) : new Date(),
      createdById: userId,
    },
  });
}

export async function deleteExpense(tenantId: string, id: string) {
  const e = await db.expense.findFirst({ where: { id, tenantId }, select: { id: true } });
  if (!e) throw new Error("Biaya tidak ditemukan.");
  return db.expense.delete({ where: { id } });
}

// ── Rentang periode ──────────────────────────────────────────────────────—
export function periodRange(period: ReportPeriod): { from: Date; to: Date; label: string } {
  // Batas hari dihitung pada zona laporan (WIB), bukan zona server (UTC di Vercel).
  const { y, m, d } = localParts();
  if (period === "today") {
    const from = startOfDay(y, m, d);
    const to = startOfDay(y, m, d + 1);
    return { from, to, label: formatLocalDate(from, { dateStyle: "full" }) };
  }
  if (period === "year") {
    return { from: startOfDay(y, 0, 1), to: startOfDay(y + 1, 0, 1), label: `Tahun ${y}` };
  }
  // month
  const from = startOfDay(y, m, 1);
  const to = startOfDay(y, m + 1, 1);
  return { from, to, label: formatLocalDate(from, { month: "long", year: "numeric" }) };
}

export interface FinanceReport {
  periodLabel: string;
  salesRevenue: number;
  salesCogs: number;
  salesGrossProfit: number;
  salesCount: number;
  serviceRevenue: number;
  serviceCount: number;
  buildRevenue: number;
  buildCount: number;
  purchaseTotal: number;
  expenseTotal: number;
  estimatedNet: number;
}

export async function getFinanceReport(
  tenantId: string,
  period: ReportPeriod,
): Promise<FinanceReport> {
  const { from, to, label } = periodRange(period);
  const range = { gte: from, lt: to };

  const [sales, services, builds, purchaseAgg, expenseAgg] = await Promise.all([
    db.sale.findMany({
      where: { tenantId, status: "COMPLETED", createdAt: range },
      select: { total: true, items: { select: { costPrice: true, qty: true } } },
    }),
    db.serviceTicket.aggregate({
      where: { tenantId, status: { not: "CANCELLED" }, createdAt: range },
      _sum: { total: true },
      _count: true,
    }),
    db.pcBuild.aggregate({
      where: { tenantId, status: { not: "CANCELLED" }, createdAt: range },
      _sum: { total: true },
      _count: true,
    }),
    db.purchase.aggregate({ where: { tenantId, createdAt: range }, _sum: { total: true } }),
    db.expense.aggregate({ where: { tenantId, date: range }, _sum: { amount: true } }),
  ]);

  const salesRevenue = sales.reduce((s, x) => s + x.total, 0);
  const salesCogs = sales.reduce(
    (s, x) => s + x.items.reduce((c, i) => c + i.costPrice * i.qty, 0),
    0,
  );
  const salesGrossProfit = salesRevenue - salesCogs;
  const serviceRevenue = services._sum.total ?? 0;
  const buildRevenue = builds._sum.total ?? 0;
  const purchaseTotal = purchaseAgg._sum.total ?? 0;
  const expenseTotal = expenseAgg._sum.amount ?? 0;
  const estimatedNet = salesGrossProfit + serviceRevenue + buildRevenue - expenseTotal;

  return {
    periodLabel: label,
    salesRevenue,
    salesCogs,
    salesGrossProfit,
    salesCount: sales.length,
    serviceRevenue,
    serviceCount: services._count,
    buildRevenue,
    buildCount: builds._count,
    purchaseTotal,
    expenseTotal,
    estimatedNet,
  };
}
