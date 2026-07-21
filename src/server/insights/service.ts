import "server-only";
import { db } from "@/lib/db";
import type { UserRole } from "@/generated/prisma/enums";
import { can } from "@/lib/rbac";
import { formatRupiah } from "@/lib/utils";
import { salesTrend, serviceTrend, topProducts, deadStock } from "@/server/analytics/service";
import { inventorySummary } from "@/server/inventory/service";
import { listReceivables } from "@/server/pos/service";
import { listPayables } from "@/server/purchasing/service";
import { getFinanceComparison } from "@/server/finance/service";

/**
 * "Tanya Arta" — mesin insight otomatis (deterministik, tanpa API eksternal).
 * Menganalisis penjualan, servis, inventaris, pembelian, keuangan & anomali,
 * lalu menyusun observasi berprioritas. Semua query ter-scope tenantId dan
 * disaring sesuai izin peran.
 */

export type InsightTone = "positive" | "info" | "warning" | "critical";
export type InsightDomain =
  | "penjualan"
  | "servis"
  | "inventaris"
  | "pembelian"
  | "keuangan"
  | "anomali";

export interface Insight {
  id: string;
  domain: InsightDomain;
  tone: InsightTone;
  title: string;
  detail: string;
  href?: string;
  actionLabel?: string;
}

const TONE_RANK: Record<InsightTone, number> = { critical: 0, warning: 1, info: 2, positive: 3 };

const sum = (arr: { total: number }[]) => arr.reduce((s, x) => s + x.total, 0);
/** Persentase perubahan; null bila tak ada pembanding. */
function pct(cur: number, prev: number): number | null {
  if (prev <= 0) return null;
  return ((cur - prev) / prev) * 100;
}
const fmtPct = (v: number) => `${Math.abs(v).toLocaleString("id-ID", { maximumFractionDigits: 0 })}%`;

export async function getArtaInsights(tenantId: string, role: UserRole): Promise<Insight[]> {
  const canReports = can(role, "reports.view");
  const canInv = can(role, "inventory.manage");
  const canPur = can(role, "purchasing.manage");
  const canFin = can(role, "finance.view");

  const since30 = new Date(Date.now() - 30 * 86400000);
  const insights: Insight[] = [];

  try {
  // Query dipecah 2 tahap agar tidak menembakkan terlalu banyak koneksi DB
  // sekaligus (bisa memicu error transien pada koneksi ter-pool/serverless).
  const [
    sTrend,
    svcTrend,
    top,
    dead,
    invSum,
    receivables,
    payables,
    svcStatus,
    lossItems,
    completed30,
    void30,
    rmaStalled,
  ] = await Promise.all([
    canReports ? salesTrend(tenantId, 14) : Promise.resolve([]),
    canReports ? serviceTrend(tenantId, 14) : Promise.resolve([]),
    canReports ? topProducts(tenantId, 30, 3) : Promise.resolve([]),
    canInv ? deadStock(tenantId, 60, 100) : Promise.resolve([]),
    canInv ? inventorySummary(tenantId) : Promise.resolve(null),
    canReports ? listReceivables(tenantId) : Promise.resolve([]),
    canPur ? listPayables(tenantId) : Promise.resolve([]),
    canReports
      ? db.serviceTicket.groupBy({ by: ["status"], where: { tenantId }, _count: true })
      : Promise.resolve([]),
    canReports
      ? db.saleItem.findMany({
          where: { sale: { tenantId, status: "COMPLETED", createdAt: { gte: since30 } } },
          select: { productName: true, price: true, costPrice: true, qty: true },
        })
      : Promise.resolve([]),
    canReports
      ? db.sale.count({ where: { tenantId, status: "COMPLETED", createdAt: { gte: since30 } } })
      : Promise.resolve(0),
    canReports
      ? db.sale.count({ where: { tenantId, status: "VOID", createdAt: { gte: since30 } } })
      : Promise.resolve(0),
    // Klaim RMA yang terlalu lama tertahan di distributor (>30 hari).
    canInv
      ? db.rmaClaim.findMany({
          where: { tenantId, status: "SENT", sentAt: { lt: since30 } },
          select: { number: true, productName: true, sentAt: true },
          orderBy: { sentAt: "asc" },
          take: 5,
        })
      : Promise.resolve([]),
  ]);
  const finance = canFin ? await getFinanceComparison(tenantId, "month") : null;

  // ── Penjualan ──────────────────────────────────────────────────────────
  if (canReports) {
    const last7 = sum(sTrend.slice(7));
    const prev7 = sum(sTrend.slice(0, 7));
    const p = pct(last7, prev7);
    if (last7 === 0 && prev7 === 0) {
      insights.push({
        id: "sales-idle",
        domain: "penjualan",
        tone: "info",
        title: "Belum ada penjualan 2 minggu terakhir",
        detail: "Belum ada transaksi tercatat. Mulai transaksi lewat kasir untuk mengisi tren.",
        href: "/pos",
        actionLabel: "Buka Kasir",
      });
    } else if (p !== null && p >= 10) {
      insights.push({
        id: "sales-up",
        domain: "penjualan",
        tone: "positive",
        title: `Penjualan naik ${fmtPct(p)} minggu ini`,
        detail: `Omzet 7 hari terakhir ${formatRupiah(last7)}, dari ${formatRupiah(prev7)} pada 7 hari sebelumnya. Pertahankan momentum!`,
        href: "/reports",
        actionLabel: "Lihat tren",
      });
    } else if (p !== null && p <= -10) {
      insights.push({
        id: "sales-down",
        domain: "penjualan",
        tone: "warning",
        title: `Penjualan turun ${fmtPct(p)} minggu ini`,
        detail: `Omzet 7 hari terakhir ${formatRupiah(last7)}, turun dari ${formatRupiah(prev7)}. Pertimbangkan promo atau tinjau stok laris.`,
        href: "/reports",
        actionLabel: "Lihat tren",
      });
    } else if (prev7 === 0 && last7 > 0) {
      // pct() null saat pembanding nol — jangan sebut "setara minggu sebelumnya".
      insights.push({
        id: "sales-resumed",
        domain: "penjualan",
        tone: "positive",
        title: "Penjualan mulai masuk minggu ini",
        detail: `Omzet 7 hari terakhir ${formatRupiah(last7)}, setelah minggu sebelumnya tanpa transaksi.`,
        href: "/reports",
        actionLabel: "Lihat tren",
      });
    } else if (last7 > 0) {
      insights.push({
        id: "sales-stable",
        domain: "penjualan",
        tone: "info",
        title: "Penjualan relatif stabil",
        detail: `Omzet 7 hari terakhir ${formatRupiah(last7)}, setara minggu sebelumnya.`,
      });
    }

    if (top[0] && top[0].qty > 0) {
      insights.push({
        id: "top-product",
        domain: "penjualan",
        tone: "info",
        title: `Produk terlaris: ${top[0].name}`,
        detail: `${top[0].qty} unit terjual (30 hari), omzet ${formatRupiah(top[0].revenue)}. Pastikan stoknya aman.`,
      });
    }
  }

  // ── Servis ─────────────────────────────────────────────────────────────
  if (canReports) {
    const statusCount = (s: string) =>
      (svcStatus as { status: string; _count: number }[]).find((r) => r.status === s)?._count ?? 0;
    const ready = statusCount("DONE");
    const waiting = statusCount("WAITING_PARTS");
    const svcLast7 = sum(svcTrend.slice(7));
    const svcPrev7 = sum(svcTrend.slice(0, 7));
    const sp = pct(svcLast7, svcPrev7);

    if (ready > 0) {
      insights.push({
        id: "svc-ready",
        domain: "servis",
        tone: "info",
        title: `${ready} unit servis siap diambil`,
        detail: "Ada tiket berstatus Selesai yang belum diserahkan. Hubungi pelanggan agar segera diambil.",
        href: "/service",
        actionLabel: "Lihat tiket",
      });
    }
    if (waiting > 0) {
      insights.push({
        id: "svc-waiting",
        domain: "servis",
        tone: "warning",
        title: `${waiting} tiket menunggu sparepart`,
        detail: "Beberapa servis tertahan menunggu sparepart. Cek ketersediaan atau pesan ke supplier.",
        href: "/service",
        actionLabel: "Lihat tiket",
      });
    }
    if (sp !== null && sp >= 10) {
      insights.push({
        id: "svc-up",
        domain: "servis",
        tone: "positive",
        title: `Pendapatan servis naik ${fmtPct(sp)}`,
        detail: `Servis 7 hari terakhir ${formatRupiah(svcLast7)}, naik dari ${formatRupiah(svcPrev7)}.`,
      });
    } else if (sp !== null && sp <= -10) {
      insights.push({
        id: "svc-down",
        domain: "servis",
        tone: "info",
        title: `Pendapatan servis turun ${fmtPct(sp)}`,
        detail: `Servis 7 hari terakhir ${formatRupiah(svcLast7)}, turun dari ${formatRupiah(svcPrev7)}.`,
      });
    }
  }

  // ── Inventaris ─────────────────────────────────────────────────────────
  if (canInv && invSum) {
    if (invSum.outOfStock > 0) {
      insights.push({
        id: "inv-out",
        domain: "inventaris",
        tone: "critical",
        title: `${invSum.outOfStock} produk kehabisan stok`,
        detail: "Produk dengan stok nol berisiko kehilangan penjualan. Segera lakukan pembelian ulang.",
        href: "/purchasing/reorder",
        actionLabel: "Saran pembelian",
      });
    }
    if (invSum.lowStock > 0) {
      insights.push({
        id: "inv-low",
        domain: "inventaris",
        tone: "warning",
        title: `${invSum.lowStock} produk menipis`,
        detail: "Stok mendekati batas minimum. Rencanakan restock sebelum habis.",
        href: "/purchasing/reorder",
        actionLabel: "Saran pembelian",
      });
    }
    if (dead.length > 0) {
      const value = dead.reduce((s, p) => s + p.stock * p.sellPrice, 0);
      insights.push({
        id: "inv-dead",
        domain: "inventaris",
        tone: "info",
        title: `${dead.length} produk tak laku 60 hari`,
        detail: `Sekitar ${formatRupiah(value)} modal tertahan di stok mati. Pertimbangkan diskon atau bundling.`,
        href: "/reports",
        actionLabel: "Lihat stok mati",
      });
    }
    if (invSum.outOfStock === 0 && invSum.lowStock === 0) {
      insights.push({
        id: "inv-ok",
        domain: "inventaris",
        tone: "positive",
        title: "Stok dalam kondisi sehat",
        detail: `Tidak ada produk habis atau menipis. Nilai modal stok ${formatRupiah(invSum.stockValue)}.`,
      });
    }
  }

  // ── RMA: klaim terlalu lama di distributor ─────────────────────────────
  if (canInv && rmaStalled.length > 0) {
    const oldest = rmaStalled[0];
    const days = Math.floor((Date.now() - oldest.sentAt.getTime()) / 86400000);
    insights.push({
      id: "rma-stalled",
      domain: "inventaris",
      tone: "warning",
      title: `${rmaStalled.length} klaim RMA >30 hari di distributor`,
      detail: `Terlama: ${oldest.number} (${oldest.productName}) sudah ${days} hari belum kembali. Tanyakan progresnya ke distributor.`,
      href: "/rma",
      actionLabel: "Lihat klaim RMA",
    });
  }

  // ── Pembelian & Utang ──────────────────────────────────────────────────
  if (canPur) {
    const overdue = payables.filter((p) => p.overdue);
    if (overdue.length > 0) {
      const total = overdue.reduce((s, p) => s + p.outstanding, 0);
      insights.push({
        id: "pay-overdue",
        domain: "pembelian",
        tone: "critical",
        title: `${overdue.length} utang supplier lewat tempo`,
        detail: `Total ${formatRupiah(total)} sudah jatuh tempo. Segera lunasi agar hubungan supplier terjaga.`,
        href: "/payables",
        actionLabel: "Bayar utang",
      });
    }
  }

  // ── Piutang ────────────────────────────────────────────────────────────
  if (canReports) {
    const overdue = receivables.filter((r) => r.overdue);
    if (overdue.length > 0) {
      const total = overdue.reduce((s, r) => s + r.outstanding, 0);
      insights.push({
        id: "recv-overdue",
        domain: "penjualan",
        tone: "warning",
        title: `${overdue.length} piutang lewat tempo`,
        detail: `Total ${formatRupiah(total)} belum tertagih dan sudah jatuh tempo. Tagih ke pelanggan.`,
        href: "/receivables",
        actionLabel: "Lihat piutang",
      });
    }
  }

  // ── Keuangan ───────────────────────────────────────────────────────────
  if (canFin && finance) {
    const { current, previous } = finance;
    const curRevenue = current.salesRevenue + current.serviceRevenue + current.buildRevenue;
    // Laba kotor servis/rakitan = omzet dikurangi modal stok yang terpakai.
    const curGross =
      current.salesGrossProfit +
      (current.serviceRevenue - current.serviceCogs) +
      (current.buildRevenue - current.buildCogs);

    if (current.estimatedNet < 0) {
      insights.push({
        id: "fin-loss",
        domain: "keuangan",
        tone: "critical",
        title: "Bulan ini masih rugi",
        detail: `Estimasi laba bersih ${formatRupiah(current.estimatedNet)}. Tinjau biaya operasional & margin jual.`,
        href: "/finance",
        actionLabel: "Buka keuangan",
      });
    } else {
      const np = pct(current.estimatedNet, previous.estimatedNet);
      if (np !== null && np >= 10) {
        insights.push({
          id: "fin-net-up",
          domain: "keuangan",
          tone: "positive",
          title: `Laba bersih naik ${fmtPct(np)} vs bulan lalu`,
          detail: `Laba bersih bulan ini ${formatRupiah(current.estimatedNet)}, dari ${formatRupiah(previous.estimatedNet)}.`,
          href: "/finance",
          actionLabel: "Buka keuangan",
        });
      } else if (np !== null && np <= -10) {
        insights.push({
          id: "fin-net-down",
          domain: "keuangan",
          tone: "warning",
          title: `Laba bersih turun ${fmtPct(np)} vs bulan lalu`,
          detail: `Laba bersih bulan ini ${formatRupiah(current.estimatedNet)}, turun dari ${formatRupiah(previous.estimatedNet)}.`,
          href: "/finance",
          actionLabel: "Buka keuangan",
        });
      }
    }

    if (curRevenue > 0) {
      const margin = (curGross / curRevenue) * 100;
      if (margin < 15) {
        insights.push({
          id: "fin-margin",
          domain: "keuangan",
          tone: "warning",
          title: `Margin kotor tipis (${margin.toLocaleString("id-ID", { maximumFractionDigits: 0 })}%)`,
          detail: "Margin kotor rendah menandakan harga jual terlalu dekat dengan modal. Tinjau penetapan harga.",
          href: "/finance",
          actionLabel: "Buka keuangan",
        });
      }
    }

    const ep = pct(current.expenseTotal, previous.expenseTotal);
    if (ep !== null && ep >= 30 && current.expenseTotal > 0) {
      insights.push({
        id: "fin-expense-spike",
        domain: "anomali",
        tone: "warning",
        title: `Biaya operasional melonjak ${fmtPct(ep)}`,
        detail: `Biaya bulan ini ${formatRupiah(current.expenseTotal)}, naik tajam dari ${formatRupiah(previous.expenseTotal)} bulan lalu.`,
        href: "/finance/expenses",
        actionLabel: "Cek biaya",
      });
    }
  }

  // ── Anomali penjualan ──────────────────────────────────────────────────
  if (canReports) {
    const loss = lossItems.filter((i) => i.costPrice > 0 && i.price < i.costPrice);
    if (loss.length > 0) {
      const names = [...new Set(loss.map((i) => i.productName))].slice(0, 3).join(", ");
      insights.push({
        id: "anomaly-below-cost",
        domain: "anomali",
        tone: "critical",
        title: `${loss.length} penjualan di bawah modal`,
        detail: `Harga jual lebih rendah dari modal pada 30 hari terakhir (mis. ${names}). Cek harga & diskon.`,
        href: "/sales",
        actionLabel: "Tinjau penjualan",
      });
    }
    if (completed30 >= 10 && void30 / (completed30 + void30) >= 0.15) {
      insights.push({
        id: "anomaly-void",
        domain: "anomali",
        tone: "warning",
        title: `Tingkat void tinggi (${void30} transaksi)`,
        detail: `Ada ${void30} transaksi dibatalkan dari ${completed30 + void30} dalam 30 hari. Cek proses kasir.`,
        href: "/sales",
        actionLabel: "Tinjau penjualan",
      });
    }

    // Penjualan berhenti mendadak: 3 hari terakhir kosong padahal sebelumnya ada.
    const last3 = sum(sTrend.slice(11));
    const before = sum(sTrend.slice(0, 11));
    if (last3 === 0 && before > 0) {
      insights.push({
        id: "anomaly-stalled",
        domain: "anomali",
        tone: "warning",
        title: "Tidak ada penjualan 3 hari terakhir",
        detail: "Penjualan terhenti padahal sebelumnya ada transaksi. Pastikan toko/kasir beroperasi normal.",
        href: "/sales",
        actionLabel: "Tinjau penjualan",
      });
    }
  }

    insights.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
    return insights;
  } catch (e) {
    // Fail-safe: kegagalan sesaat (mis. koneksi DB) tak boleh meng-crash
    // halaman. Kembalikan apa yang sempat terkumpul, jangan lempar error.
    console.error("getArtaInsights gagal:", e);
    insights.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
    return insights;
  }
}
