/**
 * Audit "Modal sparepart servis" (dan komponen rakit PC) yang tampak kebesaran
 * di Laporan Keuangan. LAPORAN SAJA — tidak mengubah data.
 *
 * Latar: kolom `costPrice` pada service_items/pc_build_items ditambahkan
 * belakangan lalu di-backfill dengan harga modal produk SAAT INI (perkiraan).
 * Untuk produk yang harga modalnya kemudian berubah (kena pembelian) atau salah
 * input, angka backfill bisa jauh dari kenyataan → modal sparepart membengkak.
 *
 * Skrip membandingkan, untuk sparepart pada tiket DONE/DELIVERED:
 *   pendapatan sparepart = Σ subtotal   vs   modal (yang tampil) = Σ costPrice×qty
 * lalu menampilkan:
 *   1) ringkasan per toko,
 *   2) rincian per PRODUK (kontributor modal terbesar) + modal-produk-kini & jual,
 *   3) baris item mencurigakan (modal item > harga jual item).
 *
 * Pemakaian:
 *   node scripts/service-cogs-audit.mjs           # ringkasan + produk teratas
 *   node scripts/service-cogs-audit.mjs --all     # tampilkan semua baris item
 *
 * Membaca DATABASE_URL dari .env.
 */
import "dotenv/config";
import pg from "pg";

const SHOW_ALL = process.argv.includes("--all");
const fmt = (n) => Number(n).toLocaleString("id-ID");

async function rowsFor(client, cfg) {
  const { rows } = await client.query(`
    SELECT t.name AS tenant, doc.number AS doc_number, it.${cfg.nameCol} AS product,
           it."productId" AS product_id, it.qty, it.price, it.subtotal,
           it."costPrice" AS item_cost, p."costPrice" AS product_cost, p."sellPrice" AS product_sell
    FROM ${cfg.itemTable} it
    JOIN ${cfg.docTable} doc ON doc.id = it."${cfg.docFk}"
    JOIN tenants t ON t.id = doc."tenantId"
    LEFT JOIN products p ON p.id = it."productId"
    WHERE it."productId" IS NOT NULL AND doc.status IN ('DONE','DELIVERED')
  `);
  return rows.map((r) => ({ ...r, lineCost: Number(r.item_cost) * Number(r.qty), lineRev: Number(r.subtotal) }));
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL tidak diset (cek .env).");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const service = (await rowsFor(client, { itemTable: "service_items", docTable: "service_tickets", docFk: "ticketId", nameCol: "name" }))
      .map((r) => ({ ...r, kind: "SERVIS" }));
    const build = (await rowsFor(client, { itemTable: "pc_build_items", docTable: "pc_builds", docFk: "buildId", nameCol: `"productName"` }))
      .map((r) => ({ ...r, kind: "RAKIT" }));
    const all = [...service, ...build];

    console.log(`\n🔧 Audit modal sparepart/komponen — ${all.length} baris (tiket selesai) diperiksa.`);
    console.log("Mode: LAPORAN SAJA (tidak mengubah data).\n");

    // 1) Ringkasan per toko × jenis (SERVIS/RAKIT) — cocok dengan baris laporan.
    const byTenant = new Map();
    for (const r of all) {
      const key = `${r.tenant}|${r.kind}`;
      const s = byTenant.get(key) ?? { tenant: r.tenant, kind: r.kind, rev: 0, cogs: 0 };
      s.rev += r.lineRev; s.cogs += r.lineCost;
      byTenant.set(key, s);
    }
    console.log("Ringkasan per toko & jenis (pendapatan sparepart/komponen vs modal yang tampil di laporan):");
    for (const s of byTenant.values()) {
      const label = s.kind === "SERVIS" ? "Modal sparepart servis" : "Modal komponen rakitan";
      console.log(`  • ${s.tenant} — ${label}: pendapatan Rp ${fmt(s.rev)} · modal Rp ${fmt(s.cogs)}${s.cogs > s.rev ? "  ⚠️ modal > pendapatan" : ""}`);
    }

    // 2) Kontributor modal terbesar per PRODUK.
    const byProduct = new Map();
    for (const r of all) {
      const key = `${r.tenant}|${r.product}`;
      const s = byProduct.get(key) ?? { tenant: r.tenant, product: r.product, qty: 0, cogs: 0, rev: 0, product_cost: r.product_cost, product_sell: r.product_sell, item_costs: new Set() };
      s.qty += Number(r.qty); s.cogs += r.lineCost; s.rev += r.lineRev;
      s.item_costs.add(Number(r.item_cost));
      byProduct.set(key, s);
    }
    const top = [...byProduct.values()].sort((a, b) => b.cogs - a.cogs).slice(0, 15);
    console.log("\nKontributor modal terbesar (per produk):");
    for (const p of top) {
      const costs = [...p.item_costs].sort((a, b) => a - b);
      const costStr = costs.length === 1 ? `Rp ${fmt(costs[0])}` : `Rp ${fmt(costs[0])}–${fmt(costs[costs.length - 1])}`;
      console.log(
        `  • ${p.product} (${p.tenant}): qty ${p.qty}, modal-baris Rp ${fmt(p.cogs)} vs pendapatan Rp ${fmt(p.rev)} ` +
          `| modal-item ${costStr}, modal-produk-kini Rp ${fmt(p.product_cost ?? 0)}, jual-produk Rp ${fmt(p.product_sell ?? 0)}` +
          `${(p.product_cost ?? 0) > (p.product_sell ?? 0) ? "  ⚠️ modal produk > harga jual" : ""}`,
      );
    }

    // 3) Baris item mencurigakan (modal item/unit > harga jual item/unit).
    const sus = all.filter((r) => Number(r.item_cost) > Number(r.price));
    const shown = SHOW_ALL ? all : sus;
    console.log(`\nBaris item ${SHOW_ALL ? "(semua)" : "mencurigakan (modal item > harga jual item)"}:`);
    if (shown.length === 0) {
      console.log("  ✅ Tidak ada baris dengan modal melebihi harga jualnya.");
    } else {
      for (const r of shown) {
        console.log(
          `  [${r.kind}] ${r.doc_number} · ${r.product}: qty ${r.qty}, jual/unit Rp ${fmt(r.price)}, ` +
            `modal/unit Rp ${fmt(r.item_cost)} → modal baris Rp ${fmt(r.lineCost)}`,
        );
      }
    }

    console.log(
      "\nCara baca:\n" +
        "  • Kalau modal-item = modal-produk-kini DAN modal-produk > harga jual → harga MODAL PRODUK\n" +
        "    kemungkinan salah input; perbaiki di Inventory → produk terkait.\n" +
        "  • Kalau modal-produk wajar tapi modal-item beda jauh → snapshot lama menyimpang.\n" +
        "  Kirim keluaran ini agar bisa dibuatkan koreksi yang tepat.",
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e.message);
  process.exit(1);
});
