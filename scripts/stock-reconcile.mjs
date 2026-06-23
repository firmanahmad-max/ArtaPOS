/**
 * Rekonsiliasi stok: bandingkan cache `product.stock` dengan akumulasi
 * `StockMovement` (ledger) per produk, lalu laporkan/­perbaiki selisihnya.
 *
 * Konvensi arsitektur: ledger = sumber kebenaran perubahan stok. Bila cache
 * menyimpang dari jumlah ledger, ada perubahan stok yang tak tercatat
 * (mis. seed/edit DB langsung, atau bug lama). Skrip ini MEMPERTAHANKAN nilai
 * cache (yang dipakai POS untuk cegah oversell) dan menulis satu movement
 * ADJUSTMENT agar ledger cocok dengan cache — sehingga audit konsisten tanpa
 * mengubah stok yang tampil. Untuk menyamakan dengan stok FISIK, gunakan
 * Stok Opname di aplikasi (hitung fisik), bukan skrip ini.
 *
 * Pemakaian:
 *   node scripts/stock-reconcile.mjs            # laporan saja (dry-run)
 *   node scripts/stock-reconcile.mjs --all      # tampilkan semua produk
 *   node scripts/stock-reconcile.mjs --fix      # terapkan perbaikan ledger
 *
 * Membaca DATABASE_URL dari .env (sama seperti runtime aplikasi).
 */
import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";

const APPLY = process.argv.includes("--fix");
const SHOW_ALL = process.argv.includes("--all");

const fmt = (n) => n.toLocaleString("id-ID");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL tidak diset (cek .env).");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rows } = await client.query(`
      SELECT p.id, p."tenantId", p.name, p.stock AS cache,
        COALESCE((SELECT SUM(m.qty) FROM stock_movements m WHERE m."productId" = p.id), 0)::int AS ledger,
        t.name AS tenant_name
      FROM products p
      JOIN tenants t ON t.id = p."tenantId"
      ORDER BY t.name, p.name
    `);

    const mismatches = rows.filter((r) => Number(r.cache) !== Number(r.ledger));

    console.log(`\n📦 Rekonsiliasi stok — ${rows.length} produk diperiksa.`);
    console.log(APPLY ? "Mode: PERBAIKI (--fix)\n" : "Mode: laporan saja (dry-run). Tambah --fix untuk menerapkan.\n");

    const shown = SHOW_ALL ? rows : mismatches;
    if (shown.length === 0) {
      console.log("✅ Semua konsisten — cache cocok dengan ledger.");
    } else {
      let lastTenant = null;
      for (const r of shown) {
        if (r.tenant_name !== lastTenant) {
          console.log(`\n— Toko: ${r.tenant_name} —`);
          lastTenant = r.tenant_name;
        }
        const diff = Number(r.cache) - Number(r.ledger);
        const flag = diff === 0 ? "OK      " : "MISMATCH";
        const diffStr = diff === 0 ? "" : `  (selisih ${diff > 0 ? "+" : ""}${fmt(diff)})`;
        console.log(`  [${flag}] ${r.name}: cache=${fmt(Number(r.cache))} ledger=${fmt(Number(r.ledger))}${diffStr}`);
      }
    }

    if (mismatches.length === 0) {
      console.log(`\n✅ Tidak ada selisih. Selesai.`);
      return;
    }

    console.log(`\n⚠️  ${mismatches.length} produk menyimpang.`);

    if (!APPLY) {
      console.log("Jalankan ulang dengan --fix untuk menulis movement ADJUSTMENT agar ledger = cache.");
      return;
    }

    // Terapkan: satu movement ADJUSTMENT per produk yang menyimpang.
    await client.query("BEGIN");
    try {
      for (const r of mismatches) {
        const diff = Number(r.cache) - Number(r.ledger); // qty koreksi
        await client.query(
          `INSERT INTO stock_movements (id, "tenantId", "productId", type, qty, "stockAfter", note, "createdById", "createdAt")
           VALUES ($1, $2, $3, 'ADJUSTMENT', $4, $5, $6, NULL, now())`,
          [randomUUID(), r.tenantId, r.id, diff, Number(r.cache), "Penyesuaian rekonsiliasi otomatis (selisih cache↔ledger)"],
        );
      }
      await client.query("COMMIT");
      console.log(`\n✅ Diterapkan: ${mismatches.length} movement ADJUSTMENT ditulis. Ledger kini cocok dengan cache.`);
      console.log("Catatan: stok yang ditampilkan tidak berubah; hanya audit ledger yang dirapikan.");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e.message);
  process.exit(1);
});
