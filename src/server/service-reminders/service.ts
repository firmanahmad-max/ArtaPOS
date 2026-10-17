import "server-only";
import { db } from "@/lib/db";
import { phoneKey } from "@/lib/phone";
import { addMonthsLocal, daysToDue, reminderBucket, type ReminderBucket } from "@/lib/service-reminder";

/**
 * Pengingat Servis Berkala. Daftar jatuh tempo dihitung DINAMIS dari tiket servis
 * selesai yang memuat jasa katalog berinterval: per (pelanggan × jasa) diambil servis
 * TERAKHIR → jatuh tempo = tanggal selesai + N bulan. Tabel ServiceReminder hanya
 * menyimpan tindakan toko (sudah diingatkan / dilewati). Ter-scope tenantId.
 */

export type ReminderState = "pending" | "reminded" | "skipped";

export interface ReminderRow {
  key: string; // `${sourceTicketId}:${catalogItemId}`
  sourceTicketId: string;
  sourceTicketNumber: string;
  catalogItemId: string;
  serviceName: string;
  intervalMonths: number;
  customerId: string | null;
  customerName: string;
  phone: string | null;
  waConsent: boolean;
  isMember: boolean;
  device: string;
  lastServiceAt: Date;
  dueAt: Date;
  daysToDue: number;
  bucket: ReminderBucket;
  state: ReminderState;
  actedAt: Date | null;
}

export interface ReturnedRow {
  customerName: string;
  serviceName: string;
  remindedAt: Date;
  returnedTicketId: string;
  returnedTicketNumber: string;
  returnedAt: Date;
}

const DONE = ["DONE", "DELIVERED"] as const;

export async function listServiceReminders(tenantId: string, now: number = Date.now()) {
  const catalog = await db.serviceCatalogItem.findMany({
    where: { tenantId, intervalMonths: { gt: 0 } },
    select: { id: true, name: true, intervalMonths: true, isActive: true },
  });
  if (catalog.length === 0) return { rows: [] as ReminderRow[], returned: [] as ReturnedRow[], hasCatalog: false };
  const catById = new Map(catalog.map((c) => [c.id, c]));

  const items = await db.serviceItem.findMany({
    where: { catalogItemId: { in: [...catById.keys()] }, ticket: { tenantId, status: { in: [...DONE] } } },
    select: {
      catalogItemId: true,
      ticket: {
        select: {
          id: true,
          number: true,
          customerId: true,
          customerName: true,
          customerPhone: true,
          deviceType: true,
          deviceBrand: true,
          deviceInfo: true,
          completedAt: true,
          createdAt: true,
        },
      },
    },
    take: 10_000,
  });

  // Pelanggan: tertaut langsung, atau dicocokkan lewat No. HP (tiket lama).
  const customers = await db.customer.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, phone: true, phoneKey: true, waConsent: true },
  });
  const custById = new Map(customers.map((c) => [c.id, c]));
  const custByKey = new Map<string, (typeof customers)[number] | null>();
  for (const c of customers) if (c.phoneKey) custByKey.set(c.phoneKey, custByKey.has(c.phoneKey) ? null : c);

  type Hit = { ticket: (typeof items)[number]["ticket"]; at: Date };
  const groups = new Map<string, { catId: string; hits: Hit[] }>();
  for (const it of items) {
    const t = it.ticket;
    // Kunci orang: pelanggan tertaut, atau member yang No. HP-nya cocok (tiket lama tanpa
    // tautan), atau No. HP saja. Dengan begitu tiket lama & baru orang yang sama tergabung.
    const pk = phoneKey(t.customerPhone);
    const matched = !t.customerId && pk ? custByKey.get(pk) : null;
    const who = t.customerId ? `c:${t.customerId}` : matched ? `c:${matched.id}` : pk ? `p:${pk}` : null;
    if (!who || !it.catalogItemId) continue; // tanpa kontak → tak bisa diingatkan
    const gk = `${who}|${it.catalogItemId}`;
    const g = groups.get(gk) ?? { catId: it.catalogItemId, hits: [] };
    g.hits.push({ ticket: t, at: t.completedAt ?? t.createdAt });
    groups.set(gk, g);
  }

  const actions = await db.serviceReminder.findMany({
    where: { tenantId },
    select: { sourceTicketId: true, catalogItemId: true, status: true, actedAt: true },
  });
  const actionByKey = new Map(actions.map((a) => [`${a.sourceTicketId}:${a.catalogItemId}`, a]));

  const rows: ReminderRow[] = [];
  const returned: ReturnedRow[] = [];
  for (const g of groups.values()) {
    const cat = catById.get(g.catId)!;
    g.hits.sort((a, b) => a.at.getTime() - b.at.getTime());
    const last = g.hits[g.hits.length - 1];
    const t = last.ticket;
    const cust = t.customerId ? custById.get(t.customerId) : custByKey.get(phoneKey(t.customerPhone) ?? "") ?? undefined;

    // Konversi: pengingat pada servis sebelumnya yang disusul servis jasa yang sama.
    for (let i = 0; i < g.hits.length - 1; i++) {
      const a = actionByKey.get(`${g.hits[i].ticket.id}:${g.catId}`);
      const next = g.hits[i + 1];
      if (a?.status === "REMINDED" && next.at >= a.actedAt) {
        returned.push({
          customerName: cust?.name ?? t.customerName ?? "Pelanggan",
          serviceName: cat.name,
          remindedAt: a.actedAt,
          returnedTicketId: next.ticket.id,
          returnedTicketNumber: next.ticket.number,
          returnedAt: next.at,
        });
      }
    }

    if (!cat.isActive) continue; // jasa dinonaktifkan → tak diingatkan lagi
    const dueAt = addMonthsLocal(last.at, cat.intervalMonths);
    const action = actionByKey.get(`${t.id}:${g.catId}`);
    rows.push({
      key: `${t.id}:${g.catId}`,
      sourceTicketId: t.id,
      sourceTicketNumber: t.number,
      catalogItemId: g.catId,
      serviceName: cat.name,
      intervalMonths: cat.intervalMonths,
      customerId: cust?.id ?? null,
      customerName: cust?.name ?? t.customerName ?? "Pelanggan",
      phone: cust?.phone ?? t.customerPhone ?? null,
      waConsent: cust ? cust.waConsent : true,
      isMember: !!cust,
      device: [t.deviceType, t.deviceBrand, t.deviceInfo].filter(Boolean).join(" "),
      lastServiceAt: last.at,
      dueAt,
      daysToDue: daysToDue(dueAt, now),
      bucket: reminderBucket(dueAt, now),
      state: action ? (action.status === "REMINDED" ? "reminded" : "skipped") : "pending",
      actedAt: action?.actedAt ?? null,
    });
  }
  rows.sort((a, b) => a.dueAt.getTime() - b.dueAt.getTime());
  returned.sort((a, b) => b.returnedAt.getTime() - a.returnedAt.getTime());
  return { rows, returned, hasCatalog: true };
}

/** Jumlah pengingat jatuh tempo yang belum ditindaklanjuti (untuk insight/badge). */
export async function countDueReminders(tenantId: string, now: number = Date.now()) {
  try {
    const { rows } = await listServiceReminders(tenantId, now);
    return rows.filter((r) => r.state === "pending" && r.bucket === "overdue").length;
  } catch {
    return 0;
  }
}

/** Catat tindakan: sudah diingatkan / dilewati (upsert per tiket sumber × jasa). */
export async function setReminderStatus(
  tenantId: string,
  userId: string,
  sourceTicketId: string,
  catalogItemId: string,
  status: "REMINDED" | "SKIPPED",
) {
  const [t, c] = await Promise.all([
    db.serviceTicket.findFirst({ where: { id: sourceTicketId, tenantId }, select: { id: true } }),
    db.serviceCatalogItem.findFirst({ where: { id: catalogItemId, tenantId }, select: { id: true } }),
  ]);
  if (!t || !c) throw new Error("Pengingat tidak ditemukan.");
  await db.serviceReminder.upsert({
    where: { sourceTicketId_catalogItemId: { sourceTicketId, catalogItemId } },
    create: { tenantId, sourceTicketId, catalogItemId, status, actedById: userId },
    update: { status, actedAt: new Date(), actedById: userId },
  });
}

/** Batalkan tindakan (kembali ke "belum ditindaklanjuti"). */
export async function clearReminderStatus(tenantId: string, sourceTicketId: string, catalogItemId: string) {
  await db.serviceReminder.deleteMany({ where: { tenantId, sourceTicketId, catalogItemId } });
}
