import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { saleSchema } from "@/lib/validations/pos";
import { createSale } from "@/server/pos/service";

/**
 * Endpoint SINKRONISASI (push) — menerima transaksi yang dibuat OFFLINE di
 * perangkat kasir lalu memprosesnya di server (sumber kebenaran).
 *
 * Prinsip (lihat docs/OFFLINE_ARCHITECTURE.md):
 * - Idempoten: tiap operasi membawa `clientOpId` unik. Kirim ulang aman — server
 *   mengembalikan penjualan yang sudah ada, tak dobel (dijamin createSale).
 * - Stok = delta transaksional di server; bila stok tak cukup (terjual di device
 *   lain), operasi ditandai `needs_review` — TIDAK menggagalkan seluruh batch.
 * - Nomor invoke final ditetapkan server (berurutan per tenant).
 * - Ter-scope tenant dari session; tak pernah lintas tenant.
 *
 * Fase ini: baru operasi PENJUALAN. Servis/pembelian menyusul.
 */

const opSchema = saleSchema.extend({
  // Wajib untuk sinkron (idempotensi). Online biasa boleh tanpa ini.
  clientOpId: z.string().min(8).max(64),
});
const pushSchema = z.object({
  ops: z.array(opSchema).min(1).max(200),
});

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = await db.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId, isActive: true },
    select: { id: true, name: true, role: true, tenant: { select: { isActive: true } } },
  });
  if (!user || !user.tenant.isActive) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!can(user.role, "pos.use")) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = pushSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const results: {
    clientOpId: string;
    ok: boolean;
    status: "synced" | "duplicate" | "needs_review" | "error";
    saleId?: string;
    number?: string;
    message?: string;
  }[] = [];

  // Diproses BERURUTAN: tiap createSale transaksi sendiri (nomor final terurut,
  // tekanan koneksi terkendali). Satu op gagal tak menjatuhkan yang lain.
  for (const sale of parsed.data.ops) {
    try {
      const r = await createSale(session.tenantId, { id: user.id, name: user.name }, sale);
      results.push({
        clientOpId: sale.clientOpId,
        ok: true,
        status: r.duplicate ? "duplicate" : "synced",
        saleId: r.id,
        number: r.number,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal memproses.";
      // Stok tak cukup / produk hilang = konflik yang perlu ditinjau kasir,
      // bukan error teknis — jangan hapus dari outbox membabi buta.
      const needsReview = /tidak cukup|tidak ditemukan/i.test(message);
      results.push({
        clientOpId: sale.clientOpId,
        ok: false,
        status: needsReview ? "needs_review" : "error",
        message,
      });
    }
  }

  return NextResponse.json({ results });
}
