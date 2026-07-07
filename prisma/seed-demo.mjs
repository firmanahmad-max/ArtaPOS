/**
 * Seed AKUN DEMO ArtaPOS — 1 toko lengkap dengan data mockup di semua modul.
 * Idempoten: menghapus tenant demo (slug `demo-artapos`) lalu membuat ulang.
 * Menjaga invarian: product.stock = akumulasi StockMovement, total transaksi,
 * poin loyalitas, piutang/utang, shift kasir.
 *
 * Jalankan:  node prisma/seed-demo.mjs
 *   - Lokal   : DATABASE_URL menunjuk localhost (default .env).
 *   - Produksi: set DATABASE_URL ke Supabase (pooler 6543) sebelum menjalankan.
 *
 * Login demo:  demo@artapos.id / demo1234  (Owner)
 */
import "dotenv/config";
import pg from "pg";
import { hash } from "@node-rs/argon2";

const { Client } = pg;
const url = process.env.DATABASE_URL || "";
const isLocal = /(localhost|127\.0\.0\.1)/.test(url);
const c = new Client({ connectionString: url, ...(isLocal ? {} : { ssl: { rejectUnauthorized: false } }) });

const TENANT_ID = "demo_tenant_artapos";
const SLUG = "demo-artapos";
const OWNER_ID = "demo_user_owner";
const KASIR_ID = "demo_user_kasir";
const TEKNISI_ID = "demo_user_teknisi";

let seq = 0;
const uid = (p) => `demo_${p}_${(seq++).toString(36)}`;
const at = (daysAgo, hour = 10, min = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, min, 0, 0);
  return d;
};

async function insert(table, obj) {
  const keys = Object.keys(obj);
  const cols = keys.map((k) => `"${k}"`).join(",");
  const params = keys.map((_, i) => `$${i + 1}`).join(",");
  await c.query(`INSERT INTO ${table} (${cols}) VALUES (${params})`, keys.map((k) => obj[k]));
}

const stock = {}; // productId -> running
async function movement(productId, type, qty, when, note) {
  stock[productId] = (stock[productId] || 0) + qty;
  await insert("stock_movements", {
    id: uid("mv"),
    tenantId: TENANT_ID,
    productId,
    type,
    qty,
    stockAfter: stock[productId],
    note: note || null,
    createdById: OWNER_ID,
    createdAt: when,
  });
}

async function main() {
  await c.connect();
  console.log("Target DB:", isLocal ? "LOKAL" : "REMOTE", "—", url.replace(/:[^:@/]+@/, ":***@"));

  await c.query("BEGIN");
  try {
    // Bersihkan tenant demo lama (cascade menghapus semua datanya).
    await c.query("DELETE FROM tenants WHERE slug=$1", [SLUG]);
    // Hapus sisa user demo lintas-tenant (email unik per-tenant, aman).
    await c.query("DELETE FROM users WHERE email IN ($1,$2,$3)", ["demo@artapos.id", "kasir@artapos.id", "teknisi@artapos.id"]);

    const now = new Date();

    // ── Tenant + Lisensi + Pengguna ─────────────────────────────────────────
    await insert("tenants", {
      id: TENANT_ID,
      name: "Demo Komputer ArtaPOS",
      slug: SLUG,
      isActive: true,
      address: "Jl. Teknologi No. 88, Bandung",
      phone: "0822-1000-2000",
      receiptFooter: "Terima kasih telah berbelanja · Garansi resmi",
      trackPromo: "Promo demo: cek servis & garansi Anda di sini. Hubungi 0822-1000-2000.",
      createdAt: at(120),
      updatedAt: now,
    });
    await insert("licenses", {
      id: uid("lic"),
      tenantId: TENANT_ID,
      plan: "DEMO_MONTHLY",
      status: "ACTIVE",
      maxTransactions: null,
      transactionsUsed: 0, // di-update di akhir
      validUntil: new Date(now.getTime() + 30 * 86400000),
      createdAt: at(120),
      updatedAt: now,
    });
    const pw = await hash("demo1234");
    const users = [
      { id: OWNER_ID, email: "demo@artapos.id", name: "Andi Pratama", role: "OWNER" },
      { id: KASIR_ID, email: "kasir@artapos.id", name: "Siti Rahayu", role: "KASIR" },
      { id: TEKNISI_ID, email: "teknisi@artapos.id", name: "Budi Santoso", role: "TEKNISI" },
    ];
    for (const u of users) {
      await insert("users", {
        id: u.id,
        tenantId: TENANT_ID,
        email: u.email,
        name: u.name,
        passwordHash: pw,
        role: u.role,
        isActive: true,
        isSuperAdmin: false,
        lastLoginAt: at(1),
        createdAt: at(120),
        updatedAt: now,
      });
    }

    // ── Satuan & Kategori ───────────────────────────────────────────────────
    const units = { unit: uid("un"), pcs: uid("un"), box: uid("un"), set: uid("un") };
    const unitDefs = [["unit", "Unit", "unit"], ["pcs", "Pcs", "pcs"], ["box", "Box", "box"], ["set", "Set", "set"]];
    for (const [k, name, sym] of unitDefs) await insert("units", { id: units[k], tenantId: TENANT_ID, name, symbol: sym, createdAt: at(120), updatedAt: now });

    const catNames = ["Laptop", "PC & Rakitan", "Komponen", "Aksesoris", "Printer & Scanner", "Jaringan"];
    const cat = {};
    for (const name of catNames) { cat[name] = uid("cat"); await insert("categories", { id: cat[name], tenantId: TENANT_ID, name, description: null, createdAt: at(120), updatedAt: now }); }

    // ── Supplier ────────────────────────────────────────────────────────────
    const sup = {};
    const supDefs = [
      ["s1", "PT Sumber Komputer Jaya", "021-5550100", "sales@sumberkomputer.co.id", "Jakarta Pusat"],
      ["s2", "CV Mitra Teknologi", "022-4440200", "order@mitratekno.id", "Bandung"],
      ["s3", "Distributor Nusantara Digital", "031-3330300", null, "Surabaya"],
    ];
    for (const [k, name, phone, email, addr] of supDefs) { sup[k] = uid("sup"); await insert("suppliers", { id: sup[k], tenantId: TENANT_ID, name, phone, email, address: addr, isActive: true, createdAt: at(100), updatedAt: now }); }

    // ── Pelanggan ───────────────────────────────────────────────────────────
    const cust = {};
    const custDefs = [
      ["c1", "Dewi Lestari", "081234567801", "Jl. Melati 12, Bandung"],
      ["c2", "Rudi Hartono", "081234567802", null],
      ["c3", "Toko Berkah Jaya", "081234567803", "Pasar Baru Blok C-5"],
      ["c4", "Maya Sari", "081234567804", null],
      ["c5", "Fajar Nugroho", "081234567805", "Jl. Anggrek 4"],
    ];
    for (const [k, name, phone, addr] of custDefs) { cust[k] = { id: uid("cust"), name }; await insert("customers", { id: cust[k].id, tenantId: TENANT_ID, name, phone, email: null, address: addr, points: 0, isActive: true, createdAt: at(90), updatedAt: now }); }
    const custPoints = {};

    // ── Produk (+ stok awal via movement INITIAL) ───────────────────────────
    const P = [
      ["vivobook", "LP-VIVO14", "8991000000011", "Asus VivoBook 14 A1400", "Laptop", "unit", 6500000, 7499000, 8, 2, 12],
      ["aspire5", "LP-ASP5", "8991000000028", "Acer Aspire 5 A514", "Laptop", "unit", 7000000, 7999000, 5, 2, 12],
      ["ideapad3", "LP-IDEA3", "8991000000035", "Lenovo IdeaPad Slim 3", "Laptop", "unit", 5800000, 6799000, 6, 2, 12],
      ["ssd1tb", "CP-SSD1TB", "8991000000042", "SSD NVMe 1TB Gen4", "Komponen", "pcs", 900000, 1150000, 25, 5, 36],
      ["ram8", "CP-RAM8", "8991000000059", "RAM DDR4 8GB 3200MHz", "Komponen", "pcs", 320000, 450000, 4, 8, 12],
      ["ram16", "CP-RAM16", "8991000000066", "RAM DDR4 16GB 3200MHz", "Komponen", "pcs", 600000, 799000, 15, 5, 12],
      ["mobo", "CP-B550M", "8991000000073", "Motherboard B550M", "Komponen", "pcs", 1500000, 1850000, 7, 3, 24],
      ["ryzen5", "CP-R5600", "8991000000080", "Processor Ryzen 5 5600", "Komponen", "pcs", 1800000, 2150000, 6, 2, 36],
      ["rtx4060", "CP-RTX4060", "8991000000097", "VGA RTX 4060 8GB", "Komponen", "pcs", 4500000, 5299000, 4, 2, 24],
      ["psu650", "CP-PSU650", "8991000000103", "PSU 650W 80+ Bronze", "Komponen", "pcs", 550000, 750000, 10, 3, 24],
      ["casing", "CP-CASE", "8991000000110", "Casing Gaming ATX RGB", "Komponen", "pcs", 400000, 599000, 3, 4, 6],
      ["keyboard", "AC-KBMEK", "8991000000127", "Keyboard Mekanik RGB", "Aksesoris", "pcs", 250000, 399000, 20, 5, 12],
      ["mouse", "AC-MSGAME", "8991000000134", "Mouse Gaming 6400 DPI", "Aksesoris", "pcs", 150000, 249000, 25, 6, 12],
      ["monitor", "AC-MON24", "8991000000141", 'Monitor 24" IPS 100Hz', "Aksesoris", "unit", 1200000, 1499000, 9, 3, 12],
      ["headset", "AC-HSGAME", "8991000000158", "Headset Gaming 7.1", "Aksesoris", "pcs", 200000, 329000, 2, 4, 12],
      ["webcam", "AC-WEBHD", "8991000000165", "Webcam HD 1080p", "Aksesoris", "pcs", 180000, 279000, 0, 3, 12],
      ["printer", "PR-EPL3210", "8991000000172", "Printer Epson L3210", "Printer & Scanner", "unit", 2200000, 2549000, 6, 2, 12],
      ["router", "NW-RTWIFI6", "8991000000189", "Router WiFi 6 AX1800", "Jaringan", "pcs", 450000, 650000, 11, 3, 12],
    ];
    const prod = {};
    for (const [k, sku, barcode, name, category, unit, cost, sell, base, min, war] of P) {
      const id = uid("prod");
      prod[k] = { id, name, sku, cost, sell, war };
      await insert("products", {
        id, tenantId: TENANT_ID, sku, barcode, name,
        categoryId: cat[category], unitId: units[unit],
        costPrice: cost, sellPrice: sell, stock: 0, minStock: min, warrantyMonths: war,
        isActive: true, createdAt: at(90), updatedAt: now,
      });
      if (base > 0) await movement(id, "INITIAL", base, at(90), "Stok awal");
    }

    // ── Shift Kasir (1 tutup kemarin, 1 buka hari ini) ──────────────────────
    const shiftClosed = uid("shift");
    const shiftOpen = uid("shift");
    await insert("cashier_shifts", { id: shiftClosed, tenantId: TENANT_ID, userId: KASIR_ID, userName: "Siti Rahayu", status: "CLOSED", openingCash: 500000, closingCash: null, expectedCash: null, difference: null, note: null, openedAt: at(1, 8), closedAt: at(1, 17) });
    await insert("cashier_shifts", { id: shiftOpen, tenantId: TENANT_ID, userId: KASIR_ID, userName: "Siti Rahayu", status: "OPEN", openingCash: 500000, closingCash: null, expectedCash: null, difference: null, note: null, openedAt: at(0, 8), closedAt: null });

    // ── Penjualan ───────────────────────────────────────────────────────────
    let invNo = 0;
    let cashClosedShift = 0;
    let salesCount = 0;
    async function sale({ when, items, method = "CASH", cust: cu = null, discount = 0, status = "COMPLETED", shiftId = null, dpRatio = null, dueDays = 14 }) {
      invNo += 1;
      const number = `INV-${String(invNo).padStart(5, "0")}`;
      let subtotal = 0;
      const rows = items.map((it) => {
        const p = prod[it.k];
        const price = it.price ?? p.sell;
        const sub = price * it.qty - (it.disc ?? 0);
        subtotal += price * it.qty;
        return { p, qty: it.qty, price, sub, disc: it.disc ?? 0 };
      });
      const total = subtotal - discount;
      let paymentStatus = "PAID", paid = total, change = 0, dueDate = null;
      if (method === "CREDIT") {
        paid = dpRatio != null ? Math.round((total * dpRatio) / 1000) * 1000 : 0;
        paymentStatus = paid > 0 ? "PARTIAL" : "UNPAID";
        dueDate = new Date(when.getTime() + dueDays * 86400000);
      }
      const saleId = uid("sale");
      await insert("sales", {
        id: saleId, tenantId: TENANT_ID, number, status,
        customerId: cu?.id ?? null, customerName: cu?.name ?? null,
        subtotal, discount, total, paymentMethod: method, paymentStatus, paid, change, dueDate,
        cashierId: KASIR_ID, cashierName: "Siti Rahayu", shiftId, note: null, createdAt: when,
      });
      for (const r of rows) {
        await insert("sale_items", { id: uid("si"), saleId, productId: r.p.id, productName: r.p.name, sku: r.p.sku, qty: r.qty, price: r.price, costPrice: r.p.cost, discount: r.disc, subtotal: r.sub, returnedQty: 0 });
        await movement(r.p.id, "SALE", -r.qty, when, `Penjualan ${number}`);
        if (status === "VOID") await movement(r.p.id, "RETURN_IN", r.qty, when, `Void ${number}`);
      }
      if (method === "CREDIT" && paid > 0) await insert("sale_payments", { id: uid("sp"), tenantId: TENANT_ID, saleId, amount: paid, note: "DP awal", createdById: KASIR_ID, createdAt: when });
      if (cu && status === "COMPLETED") {
        const earn = Math.floor(total / 1000);
        if (earn > 0) { await insert("point_entries", { id: uid("pt"), tenantId: TENANT_ID, customerId: cu.id, points: earn, type: "EARN", note: `Belanja ${number}`, saleId, createdAt: when }); custPoints[cu.id] = (custPoints[cu.id] || 0) + earn; }
      }
      if (status === "COMPLETED") {
        salesCount += 1;
        if (method === "CASH" && shiftId === shiftClosed) cashClosedShift += total;
      }
      return saleId;
    }

    // tersebar 25 hari, beberapa di 14 hari terakhir + hari ini
    await sale({ when: at(24, 11), items: [{ k: "mouse", qty: 1 }, { k: "keyboard", qty: 1 }], cust: cust.c2 });
    await sale({ when: at(22, 14), items: [{ k: "ssd1tb", qty: 1 }], method: "TRANSFER", cust: cust.c1 });
    await sale({ when: at(20, 10), items: [{ k: "vivobook", qty: 1 }], method: "TRANSFER", cust: cust.c5 });
    await sale({ when: at(18, 16), items: [{ k: "ram16", qty: 2 }, { k: "ssd1tb", qty: 1 }], cust: cust.c3, discount: 50000 });
    await sale({ when: at(15, 12), items: [{ k: "headset", qty: 1 }], method: "QRIS" });
    await sale({ when: at(13, 9), items: [{ k: "monitor", qty: 1 }, { k: "mouse", qty: 1 }], cust: cust.c4 });
    await sale({ when: at(11, 13), items: [{ k: "printer", qty: 1 }], method: "TRANSFER", cust: cust.c3 });
    await sale({ when: at(9, 15), items: [{ k: "aspire5", qty: 1 }], method: "CREDIT", cust: cust.c1, dpRatio: 0.4, dueDays: 30 });
    await sale({ when: at(7, 11), items: [{ k: "router", qty: 1 }, { k: "keyboard", qty: 1 }], cust: cust.c5 });
    await sale({ when: at(5, 10), items: [{ k: "ram8", qty: 2 }], method: "QRIS", cust: cust.c2 });
    await sale({ when: at(4, 14), items: [{ k: "casing", qty: 1 }, { k: "psu650", qty: 1 }], cust: cust.c4 });
    await sale({ when: at(3, 16), items: [{ k: "mouse", qty: 2 }], status: "VOID", cust: cust.c2 }); // dibatalkan
    await sale({ when: at(1, 10, 30), items: [{ k: "ideapad3", qty: 1 }], method: "TRANSFER", cust: cust.c3, shiftId: shiftClosed });
    await sale({ when: at(1, 13, 15), items: [{ k: "keyboard", qty: 1 }, { k: "mouse", qty: 1 }], shiftId: shiftClosed });
    await sale({ when: at(1, 15, 40), items: [{ k: "ssd1tb", qty: 1 }], cust: cust.c5, shiftId: shiftClosed });
    await sale({ when: at(0, 9, 20), items: [{ k: "headset", qty: 1 }, { k: "mouse", qty: 1 }], cust: cust.c1, shiftId: shiftOpen });
    await sale({ when: at(0, 11, 5), items: [{ k: "monitor", qty: 1 }], method: "QRIS", shiftId: shiftOpen });
    await sale({ when: at(0, 13, 45), items: [{ k: "ram16", qty: 1 }], method: "CREDIT", cust: cust.c3, dpRatio: 0, dueDays: 14, shiftId: shiftOpen });

    // Update shift tutup (rekonsiliasi kas)
    const expectedClosed = 500000 + cashClosedShift;
    await c.query('UPDATE cashier_shifts SET "expectedCash"=$1, "closingCash"=$2, "difference"=$3 WHERE id=$4', [expectedClosed, expectedClosed - 5000, -5000, shiftClosed]);

    // Redeem sebagian poin 1 pelanggan (realistis)
    if (cust.c3) { await insert("point_entries", { id: uid("pt"), tenantId: TENANT_ID, customerId: cust.c3.id, points: -100, type: "REDEEM", note: "Tukar poin diskon", saleId: null, createdAt: at(6) }); custPoints[cust.c3.id] = (custPoints[cust.c3.id] || 0) - 100; }
    for (const k of Object.keys(cust)) { const p = custPoints[cust[k].id] || 0; if (p !== 0) await c.query('UPDATE customers SET points=$1 WHERE id=$2', [Math.max(0, p), cust[k].id]); }

    // ── Pembelian (restock) — 1 lunas, 1 sebagian, 1 belum bayar (utang) ─────
    let pbNo = 0;
    async function purchase({ when, sk, items, payStatus = "PAID", dueDays = null, paidRatio = 1 }) {
      pbNo += 1;
      const number = `PB-${String(pbNo).padStart(5, "0")}`;
      let subtotal = 0;
      const rows = items.map((it) => { const p = prod[it.k]; const s = p.cost * it.qty; subtotal += s; return { p, qty: it.qty, sub: s }; });
      const total = subtotal;
      let paidAmount = payStatus === "PAID" ? total : payStatus === "PARTIAL" ? Math.round((total * paidRatio) / 1000) * 1000 : 0;
      const purchaseId = uid("pur");
      await insert("purchases", {
        id: purchaseId, tenantId: TENANT_ID, number, supplierId: sup[sk], supplierName: supDefs.find((s) => s[0] === sk)[1],
        subtotal, total, paidAmount, paymentStatus: payStatus, dueDate: dueDays != null ? new Date(when.getTime() + dueDays * 86400000) : null,
        note: null, createdById: OWNER_ID, createdByName: "Andi Pratama", createdAt: when,
      });
      for (const r of rows) {
        await insert("purchase_items", { id: uid("pi"), purchaseId, productId: r.p.id, productName: r.p.name, qty: r.qty, costPrice: r.p.cost, subtotal: r.sub });
        await movement(r.p.id, "PURCHASE", r.qty, when, `Pembelian ${number}`);
      }
      if (paidAmount > 0) await insert("purchase_payments", { id: uid("pp"), tenantId: TENANT_ID, purchaseId, amount: paidAmount, note: payStatus === "PAID" ? "Lunas" : "DP", createdById: OWNER_ID, createdAt: when });
    }
    await purchase({ when: at(21), sk: "s1", items: [{ k: "ssd1tb", qty: 20 }, { k: "ram16", qty: 10 }], payStatus: "PAID" });
    await purchase({ when: at(12), sk: "s2", items: [{ k: "vivobook", qty: 5 }, { k: "ideapad3", qty: 4 }], payStatus: "PARTIAL", dueDays: 30, paidRatio: 0.5 });
    await purchase({ when: at(4), sk: "s3", items: [{ k: "rtx4060", qty: 3 }, { k: "ryzen5", qty: 4 }, { k: "mobo", qty: 3 }], payStatus: "UNPAID", dueDays: 2 });

    // ── Jasa Servis (semua status) ──────────────────────────────────────────
    let svNo = 0;
    async function ticket({ when, cu, phone, device, brand, info, complaint, diagnosis = null, status, labor = 0, parts = [], jasa = [], paid = 0, method = null, completedAgo = null }) {
      svNo += 1;
      const number = `SV-${String(svNo).padStart(5, "0")}`;
      const id = uid("sv");
      let partsCost = 0;
      const items = [];
      for (const p of parts) { const pr = prod[p.k]; const sub = pr.sell * p.qty; partsCost += sub; items.push({ productId: pr.id, name: pr.name, qty: p.qty, price: pr.sell, subtotal: sub, isPart: true, pk: p.k }); }
      for (const j of jasa) items.push({ productId: null, name: j.name, qty: 1, price: j.price, subtotal: j.price, isPart: false });
      const jasaTotal = jasa.reduce((s, j) => s + j.price, 0);
      const total = labor + partsCost + jasaTotal;
      const paymentStatus = paid <= 0 ? "UNPAID" : paid >= total ? "PAID" : "PARTIAL";
      await insert("service_tickets", {
        id, tenantId: TENANT_ID, number, customerId: null, customerName: cu, customerPhone: phone,
        deviceType: device, deviceBrand: brand, deviceInfo: info, complaint, diagnosis, status,
        technicianId: TEKNISI_ID, technicianName: "Budi Santoso", laborCost: labor + jasaTotal, partsCost,
        total, paid, paymentStatus, paymentMethod: method, note: null, createdById: KASIR_ID,
        createdAt: when, updatedAt: when, completedAt: completedAgo != null ? at(completedAgo) : null,
      });
      for (const it of items) {
        await insert("service_items", { id: uid("svi"), ticketId: id, productId: it.productId, name: it.name, qty: it.qty, price: it.price, subtotal: it.subtotal, isPart: it.isPart });
        if (it.isPart) await movement(it.productId, "SERVICE_OUT", -it.qty, when, `Sparepart servis ${number}`);
      }
    }
    await ticket({ when: at(16), cu: "Ahmad Rizki", phone: "081298760001", device: "Laptop", brand: "Asus ROG", info: "Strix G15", complaint: "Laptop overheat, mati sendiri", diagnosis: "Pasta processor kering, kipas kotor", status: "DELIVERED", labor: 150000, jasa: [{ name: "Bersih & ganti pasta", price: 100000 }], paid: 250000, method: "CASH", completedAgo: 12 });
    await ticket({ when: at(10), cu: "Siti Nurhaliza", phone: "081298760002", device: "Laptop", brand: "Lenovo", info: "IdeaPad 3", complaint: "Laptop lemot/hang", diagnosis: "Upgrade SSD + RAM", status: "DELIVERED", labor: 100000, parts: [{ k: "ssd1tb", qty: 1 }], paid: 1250000, method: "TRANSFER", completedAgo: 6 });
    await ticket({ when: at(5), cu: "Budi Santoso", phone: "081298760003", device: "PC", brand: "Rakitan", info: "Gaming", complaint: "Layar blank/bergaris", diagnosis: "VGA bermasalah, menunggu unit klaim", status: "WAITING_PARTS", labor: 0 });
    await ticket({ when: at(3), cu: "Dewi Lestari", phone: "081234567801", device: "Laptop", brand: "Acer", info: "Aspire 5", complaint: "Keyboard error/tidak fungsi", status: "IN_PROGRESS", labor: 75000, parts: [{ k: "keyboard", qty: 1 }] });
    await ticket({ when: at(1), cu: "Fajar Nugroho", phone: "081234567805", device: "Printer", brand: "Epson", info: "L3210", complaint: "Hasil cetak bergaris", status: "DONE", labor: 80000, jasa: [{ name: "Head cleaning", price: 50000 }], paid: 0 });
    await ticket({ when: at(0, 9), cu: "Maya Sari", phone: "081234567804", device: "Laptop", brand: "HP", info: "Pavilion 14", complaint: "Baterai cepat habis", status: "RECEIVED" });
    await ticket({ when: at(8), cu: "Reza Mahendra", phone: "081298760006", device: "PC", brand: "Rakitan", info: "Kantor", complaint: "Tidak mau menyala", status: "CANCELLED" });

    // ── Rakit PC ────────────────────────────────────────────────────────────
    let rktNo = 0;
    async function build({ when, name, cu, status, fee, comps, paid = 0, completedAgo = null }) {
      rktNo += 1;
      const number = `RKT-${String(rktNo).padStart(5, "0")}`;
      const id = uid("rkt");
      let componentsCost = 0;
      const items = comps.map((x) => { const p = prod[x.k]; const sub = p.sell * (x.qty || 1); componentsCost += sub; return { p, qty: x.qty || 1, price: p.sell, sub }; });
      const total = componentsCost + fee;
      const paymentStatus = paid <= 0 ? "UNPAID" : paid >= total ? "PAID" : "PARTIAL";
      await insert("pc_builds", { id, tenantId: TENANT_ID, number, name, customerId: null, customerName: cu, status, buildFee: fee, componentsCost, total, paid, paymentStatus, note: null, createdById: TEKNISI_ID, createdAt: when, updatedAt: when, completedAt: completedAgo != null ? at(completedAgo) : null });
      for (const it of items) {
        await insert("pc_build_items", { id: uid("rki"), buildId: id, productId: it.p.id, productName: it.p.name, qty: it.qty, price: it.price, subtotal: it.sub });
        if (status !== "DRAFT" && status !== "CANCELLED") await movement(it.p.id, "BUILD_OUT", -it.qty, when, `Komponen rakitan ${number}`);
      }
    }
    await build({ when: at(14), name: "PC Gaming Rudi", cu: "Rudi Hartono", status: "DELIVERED", fee: 350000, comps: [{ k: "ryzen5" }, { k: "mobo" }, { k: "ram16", qty: 2 }, { k: "rtx4060" }, { k: "ssd1tb" }, { k: "psu650" }, { k: "casing" }], paid: 13000000, completedAgo: 10 });
    await build({ when: at(2), name: "PC Kantor Toko Berkah", cu: "Toko Berkah Jaya", status: "ASSEMBLING", fee: 250000, comps: [{ k: "ryzen5" }, { k: "mobo" }, { k: "ram8", qty: 1 }, { k: "ssd1tb" }, { k: "psu650" }, { k: "casing" }], paid: 2000000 });
    await build({ when: at(0, 12), name: "PC Editing Maya (draft)", cu: "Maya Sari", status: "DRAFT", fee: 400000, comps: [{ k: "ryzen5" }, { k: "ram16", qty: 2 }, { k: "rtx4060" }], paid: 0 });

    // ── Biaya operasional ───────────────────────────────────────────────────
    const exp = [
      ["Sewa", "Sewa ruko bulan ini", 3000000, at(20)],
      ["Listrik", "Tagihan PLN", 850000, at(18)],
      ["Gaji", "Gaji karyawan", 4500000, at(15)],
      ["Internet", "Langganan internet", 500000, at(12)],
      ["Operasional", "ATK & kebersihan", 320000, at(8)],
      ["Marketing", "Iklan media sosial", 450000, at(5)],
    ];
    for (const [category, description, amount, date] of exp) await insert("expenses", { id: uid("exp"), tenantId: TENANT_ID, category, description, amount, date, createdById: OWNER_ID, createdAt: date });

    // ── Garansi & Nomor Seri ────────────────────────────────────────────────
    const warr = [
      ["vivobook", "SN-VIVO-2026A01", "Fajar Nugroho", cust.c5.id, 20, 12, "ACTIVE"],
      ["ideapad3", "SN-IDEA-2026B02", "Toko Berkah Jaya", cust.c3.id, 1, 12, "ACTIVE"],
      ["ssd1tb", "SN-SSD-2026C03", "Dewi Lestari", cust.c1.id, 22, 36, "ACTIVE"],
      ["rtx4060", "SN-RTX-2026D04", "Rudi Hartono", cust.c2.id, 14, 24, "CLAIMED"],
      ["printer", "SN-EPS-2026E05", null, null, 40, 12, "ACTIVE"],
    ];
    const warrIds = {};
    for (const [k, serial, cn, cid, soldAgo, months, status] of warr) {
      const id = uid("wu");
      warrIds[serial] = id;
      const soldAt = at(soldAgo);
      await insert("warranty_units", { id, tenantId: TENANT_ID, productId: prod[k].id, productName: prod[k].name, serialNumber: serial, saleId: null, saleNumber: null, customerId: cid, customerName: cn, soldAt, warrantyMonths: months, warrantyUntil: new Date(soldAt.getTime() + months * 30 * 86400000), status, note: null, createdById: KASIR_ID, createdAt: soldAt });
    }

    // ── Klaim RMA ───────────────────────────────────────────────────────────
    await insert("rma_claims", { id: uid("rma"), tenantId: TENANT_ID, number: "RMA-00001", productId: prod.rtx4060.id, warrantyUnitId: warrIds["SN-RTX-2026D04"], productName: prod.rtx4060.name, serialNumber: "SN-RTX-2026D04", complaint: "Artefak di layar, kadang no display", customerName: "Rudi Hartono", customerPhone: "081234567802", supplierId: sup.s3, supplierName: "Distributor Nusantara Digital", trackingNumber: "JNE-88001", sentAt: at(40), receivedAt: null, status: "SENT", resolution: null, replacementSn: null, note: null, createdById: OWNER_ID, createdAt: at(40), updatedAt: now });
    await insert("rma_claims", { id: uid("rma"), tenantId: TENANT_ID, number: "RMA-00002", productId: prod.ssd1tb.id, warrantyUnitId: null, productName: prod.ssd1tb.name, serialNumber: "SN-SSD-BAD-07", complaint: "Tidak terdeteksi", customerName: "Maya Sari", customerPhone: "081234567804", supplierId: sup.s1, supplierName: "PT Sumber Komputer Jaya", trackingNumber: "JNE-88002", sentAt: at(25), receivedAt: at(8), status: "RETURNED", resolution: "REPLACED", replacementSn: "SN-SSD-NEW-09", note: "Unit diganti baru oleh distributor", createdById: OWNER_ID, createdAt: at(25), updatedAt: at(8) });

    // ── Finalisasi: stok cache & pemakaian lisensi ──────────────────────────
    for (const k of Object.keys(prod)) {
      await c.query("UPDATE products SET stock=$1 WHERE id=$2", [stock[prod[k].id] || 0, prod[k].id]);
    }
    await c.query('UPDATE licenses SET "transactionsUsed"=$1 WHERE "tenantId"=$2', [salesCount, TENANT_ID]);

    await c.query("COMMIT");
    console.log("\n✅ Akun demo dibuat.");
    console.log("   Login : demo@artapos.id / demo1234  (Owner)");
    console.log("   Kasir : kasir@artapos.id / demo1234");
    console.log("   Toko  : Demo Komputer ArtaPOS  (slug demo-artapos)");
    console.log(`   Data  : ${Object.keys(prod).length} produk, ${salesCount} penjualan, ${svNo} servis, ${rktNo} rakitan, ${pbNo} pembelian, ${exp.length} biaya, ${warr.length} garansi, 2 RMA.`);
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  console.error("SEED GAGAL:", e.message);
  process.exit(1);
});
