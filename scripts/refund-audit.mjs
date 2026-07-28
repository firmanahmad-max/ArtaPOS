/**
 * Audit retur penjualan yang refund-nya KEBESARAN.
 *
 * Bug lama (diperbaiki di commit refund-proporsional): `createReturn` menghitung
 * refund = harga_kotor × qty, mengabaikan diskon per-baris. Item yang dijual
 * DISKON jadi dikembalikan uangnya lebih besar daripada yang benar-benar
 * dibayar pelanggan.
 *
 * Skrip ini membandingkan, per (penjualan × produk):
 *   - refund TERCATAT  = Σ subtotal pada sale_return_items
 *   - refund SEHARUSNYA = subtotal bersih baris × (qtyDiretur / qty), dibulatkan
 *     (memakai subtotal saleItem yang SUDAH net diskon)
 * lalu melaporkan selisih (kelebihan refund). Hanya item berdiskon yang muncul.
 *
 * LAPORAN SAJA — tidak mengubah data. Alasannya: uang refund itu SUDAH
 * benar-benar dikembalikan ke pelanggan pada nilai kotor, jadi angka tercatat
 * mencerminkan kas yang benar-benar keluar. Menurunkannya justru menyembunyikan
 * kas yang nyata keluar. Gunakan laporan ini untuk menilai dampak & (bila mau)
 * menindaklanjuti ke pelanggan.
 *
 * Pemakaian:
 *   node scripts/refund-audit.mjs           # semua toko
 *   node scripts/refund-audit.mjs --all     # tampilkan juga yang sudah benar
 *
 * Membaca DATABASE_URL dari .env (sama seperti runtime aplikasi).
 */
import "dotenv/config";
import pg from "pg";

const SHOW_ALL = process.argv.includes("--all");
const fmt = (n) => Number(n).toLocaleString("id-ID");

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL tidak diset (cek .env).");
    process.exit(1);
  }
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    // Baris penjualan yang pernah diretur, + refund tercatat per (sale, produk).
    // Refund SEHARUSNYA dihitung dari subtotal (net diskon) × porsi qty diretur.
    const { rows } = await client.query(`
      SELECT
        t.name AS tenant_name,
        s.number AS sale_number,
        si."productName" AS product_name,
        si.qty,
        si."returnedQty" AS returned_qty,
        si.discount,
        si.subtotal,
        (si.price * si."returnedQty")::int AS recorded_by_formula,
        rec.recorded_refund,
        rec.rtn_numbers,
        ROUND(si.subtotal::numeric * si."returnedQty" / si.qty)::int AS correct_refund
      FROM sale_items si
      JOIN sales s ON s.id = si."saleId"
      JOIN tenants t ON t.id = s."tenantId"
      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(sri.subtotal), 0)::int AS recorded_refund,
               STRING_AGG(DISTINCT sr.number, ', ' ORDER BY sr.number) AS rtn_numbers
        FROM sale_return_items sri
        JOIN sale_returns sr ON sr.id = sri."returnId"
        WHERE sr."saleId" = si."saleId" AND sri."productId" = si."productId"
      ) rec ON true
      WHERE si."returnedQty" > 0
      ORDER BY t.name, s.number, si."productName"
    `);

    // Pakai refund tercatat sungguhan bila ada; jika tidak, fallback ke formula
    // lama (harga×qty) agar retur lama pra-fitur pun terhitung.
    const enriched = rows.map((r) => {
      const recorded = r.recorded_refund != null ? Number(r.recorded_refund) : Number(r.recorded_by_formula);
      const correct = Number(r.correct_refund);
      return { ...r, recorded, correct, over: recorded - correct };
    });

    const flagged = enriched.filter((r) => r.over > 0);
    const shown = SHOW_ALL ? enriched : flagged;

    console.log(`\n🧾 Audit refund retur — ${rows.length} baris terjual-dan-diretur diperiksa.`);
    console.log("Mode: LAPORAN SAJA (tidak mengubah data).\n");

    if (shown.length === 0) {
      console.log("✅ Tidak ada refund yang kebesaran. Semua sesuai harga bersih.");
      console.log("\n✅ Selesai.");
      return;
    }

    let lastTenant = null;
    let grand = 0;
    let tenantSum = 0;
    const flushTenant = () => {
      if (lastTenant !== null && tenantSum > 0) {
        console.log(`   └─ Total kelebihan refund ${lastTenant}: Rp ${fmt(tenantSum)}`);
      }
    };

    for (const r of shown) {
      if (r.tenant_name !== lastTenant) {
        flushTenant();
        lastTenant = r.tenant_name;
        tenantSum = 0;
        console.log(`— Toko: ${r.tenant_name} —`);
      }
      const tag = r.over > 0 ? `KELEBIHAN Rp ${fmt(r.over)}` : "sesuai";
      const rtn = r.rtn_numbers ? ` [${r.rtn_numbers}]` : "";
      console.log(
        `  ${r.sale_number}${rtn} · ${r.product_name}: retur ${r.returned_qty}/${r.qty}, ` +
          `diskon baris Rp ${fmt(r.discount)} → tercatat Rp ${fmt(r.recorded)}, seharusnya Rp ${fmt(r.correct)}  (${tag})`,
      );
      grand += r.over;
      tenantSum += r.over;
    }
    flushTenant();

    console.log(
      `\n⚠️  ${flagged.length} baris retur kelebihan refund. Total kelebihan: Rp ${fmt(grand)}.`,
    );
    console.log(
      "Catatan: retur BARU (setelah perbaikan) sudah proporsional. Angka di atas\n" +
        "adalah kelebihan uang yang terlanjur dikembalikan pada retur LAMA.",
    );
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error("❌ Gagal:", e.message);
  process.exit(1);
});
