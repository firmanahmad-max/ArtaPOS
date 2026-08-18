import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth/dal";
import { db } from "@/lib/db";
import { can } from "@/lib/rbac";
import { saleSchema } from "@/lib/validations/pos";
import { purchaseSchema } from "@/lib/validations/purchasing";
import { serviceTicketSchema } from "@/lib/validations/service";
import { createSale } from "@/server/pos/service";
import { createPurchase } from "@/server/purchasing/service";
import { createTicket } from "@/server/service-jobs/service";

/**
 * Endpoint SINKRONISASI (push) — memproses operasi yang dibuat OFFLINE:
 * PENJUALAN, PEMBELIAN, dan TIKET SERVIS. Semua idempoten via `clientOpId`
 * (kirim ulang tak dobel), stok = delta transaksional, nomor final ditetapkan
 * server, ter-scope tenant dari session.
 *
 * Format op: `{ type: "sale"|"purchase"|"service", data: {...input, clientOpId, clientCreatedAt} }`.
 */

const withOpId = <T extends z.ZodTypeAny>(s: T) =>
  z.object({ clientOpId: z.string().min(8).max(64) }).and(s);

const PARSERS = {
  sale: withOpId(saleSchema),
  purchase: withOpId(purchaseSchema),
  service: withOpId(serviceTicketSchema),
} as const;

type OpType = keyof typeof PARSERS;

const envelopeSchema = z.object({
  ops: z
    .array(z.object({ type: z.enum(["sale", "purchase", "service"]), data: z.unknown() }))
    .min(1)
    .max(200),
});

const PERM: Record<OpType, "pos.use" | "purchasing.manage" | "service.manage"> = {
  sale: "pos.use",
  purchase: "purchasing.manage",
  service: "service.manage",
};

export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.userId) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  const user = await db.user.findFirst({
    where: { id: session.userId, tenantId: session.tenantId, isActive: true },
    select: { id: true, name: true, role: true, tenant: { select: { isActive: true } } },
  });
  if (!user || !user.tenant.isActive) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = envelopeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid body", detail: parsed.error.issues[0]?.message }, { status: 400 });
  }

  const actor = { id: user.id, name: user.name };
  const results: {
    clientOpId?: string;
    type: OpType;
    ok: boolean;
    status: "synced" | "duplicate" | "needs_review" | "error";
    id?: string;
    number?: string;
    message?: string;
  }[] = [];

  // Berurutan: tiap op transaksi sendiri; satu gagal tak menjatuhkan yang lain.
  for (const op of parsed.data.ops) {
    const type = op.type as OpType;
    // Ambil clientOpId lebih awal agar SEMUA hasil (termasuk penolakan izin/
    // validasi) bisa dicocokkan klien. Tanpa ini, item tak pernah ditandai →
    // tetap "pending" & dikirim ulang tiap sinkron (loop diam).
    const preOpId = (op.data as { clientOpId?: string })?.clientOpId;
    if (!can(user.role, PERM[type])) {
      results.push({ clientOpId: preOpId, type, ok: false, status: "error", message: "Tidak punya izin." });
      continue;
    }
    const dataParsed = PARSERS[type].safeParse(op.data);
    if (!dataParsed.success) {
      results.push({ clientOpId: preOpId, type, ok: false, status: "error", message: "Data tidak valid." });
      continue;
    }
    const data = dataParsed.data;
    const clientOpId = data.clientOpId;
    try {
      const r =
        type === "sale"
          ? await createSale(session.tenantId, actor, data as z.infer<typeof saleSchema>)
          : type === "purchase"
            ? await createPurchase(session.tenantId, actor, data as z.infer<typeof purchaseSchema>)
            : await createTicket(session.tenantId, actor, data as z.infer<typeof serviceTicketSchema>);
      results.push({
        clientOpId,
        type,
        ok: true,
        status: r.duplicate ? "duplicate" : "synced",
        id: r.id,
        number: r.number,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Gagal memproses.";
      // Konflik yang perlu ditinjau kasir (bukan error teknis).
      const needsReview = /tidak cukup|tidak ditemukan|sudah dipakai/i.test(message);
      results.push({ clientOpId, type, ok: false, status: needsReview ? "needs_review" : "error", message });
    }
  }

  return NextResponse.json({ results });
}
