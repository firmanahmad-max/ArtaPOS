import type { Metadata } from "next";
import Link from "next/link";
import { BellRing, ListChecks, CalendarClock, Send, RotateCcw } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/dal";
import { can } from "@/lib/rbac";
import { listServiceReminders } from "@/server/service-reminders/service";
import { getLoyaltyConfig } from "@/server/customers/service";
import { isProgramStarted } from "@/lib/loyalty";
import { monthsSince } from "@/lib/service-reminder";
import { daysFromNow, formatLocalDate } from "@/lib/timezone";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips } from "@/components/ui/filter-chips";
import { ReminderList, type ReminderView } from "./reminder-list";

export const metadata: Metadata = { title: "Pengingat Servis" };

export default async function ServiceRemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const user = await getCurrentUser();
  if (!can(user.role, "service.manage")) {
    return <Card className="p-8 text-center text-sm text-muted-foreground">Tidak punya izin.</Card>;
  }
  const { filter = "due" } = await searchParams;
  const now = daysFromNow(0); // = sekarang (helper agar lolos aturan purity)
  const [{ rows, returned, hasCatalog }, loyalty] = await Promise.all([
    listServiceReminders(user.tenantId, now),
    getLoyaltyConfig(user.tenantId),
  ]);
  const pointsMultiplier =
    isProgramStarted(loyalty) && loyalty.pointValue > 0 ? (loyalty.serviceMultiplier ?? 2) : null;

  const due = rows.filter((r) => r.state === "pending" && r.bucket === "overdue");
  const soon = rows.filter((r) => r.state === "pending" && r.bucket === "soon");
  const reminded = rows.filter((r) => r.state === "reminded");
  const skipped = rows.filter((r) => r.state === "skipped");
  const later = rows.filter((r) => r.state === "pending" && r.bucket === "later");
  const recentReturned = returned.filter((r) => now - r.returnedAt.getTime() <= 90 * 86_400_000);

  const shown =
    filter === "soon" ? soon : filter === "reminded" ? reminded : filter === "skipped" ? skipped : filter === "later" ? later : due;

  const toView = (r: (typeof rows)[number]): ReminderView => ({
    key: r.key,
    sourceTicketId: r.sourceTicketId,
    sourceTicketNumber: r.sourceTicketNumber,
    catalogItemId: r.catalogItemId,
    serviceName: r.serviceName,
    customerName: r.customerName,
    customerId: r.customerId,
    isMember: r.isMember,
    phone: r.phone,
    waConsent: r.waConsent,
    device: r.device,
    lastServiceText: formatLocalDate(r.lastServiceAt, { dateStyle: "medium" }),
    dueText: formatLocalDate(r.dueAt, { dateStyle: "medium" }),
    daysToDue: r.daysToDue,
    monthsAgo: monthsSince(r.lastServiceAt, now),
    state: r.state,
    actedText: r.actedAt ? formatLocalDate(r.actedAt, { dateStyle: "medium" }) : null,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pengingat Servis</h1>
          <p className="text-muted-foreground">
            Pelanggan yang jatuh tempo perawatan berkala (mis. cleaning &amp; repaste) — ingatkan via WhatsApp sekali klik.
          </p>
        </div>
        <Link href="/service/catalog" className={buttonVariants({ variant: "outline" })}>
          <ListChecks /> Katalog Jasa
        </Link>
      </div>

      {!hasCatalog ? (
        <EmptyState
          icon={BellRing}
          title="Atur jasa berkala dulu"
          description="Tambahkan jasa ke Katalog Jasa beserta interval perawatannya (mis. Cleaning & repaste laptop setiap 6 bulan). Saat jasa itu dipakai di tiket servis, pelanggan otomatis masuk daftar pengingat ketika jatuh tempo."
          action={
            <Link href="/service/catalog" className={buttonVariants()}>
              <ListChecks /> Buka Katalog Jasa
            </Link>
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Jatuh tempo" value={due.length} icon={BellRing} tone={due.length > 0 ? "rose" : "slate"} hint="Belum diingatkan" />
            <StatCard label="Segera (≤14 hari)" value={soon.length} icon={CalendarClock} tone="amber" />
            <StatCard label="Sudah diingatkan" value={reminded.length} icon={Send} tone="blue" />
            <StatCard
              label="Kembali servis (90 hari)"
              value={recentReturned.length}
              icon={RotateCcw}
              tone="emerald"
              hint="Datang lagi setelah diingatkan"
            />
          </div>

          <FilterChips
            defaultValue="due"
            chips={[
              { value: "due", label: "Jatuh tempo", count: due.length, tone: "warning" },
              { value: "soon", label: "Segera", count: soon.length },
              { value: "reminded", label: "Sudah diingatkan", count: reminded.length },
              { value: "skipped", label: "Dilewati", count: skipped.length },
              { value: "later", label: "Terjadwal", count: later.length },
            ]}
          />

          {shown.length === 0 ? (
            <Card className="p-8 text-center text-sm text-muted-foreground">
              {filter === "due" ? "Tidak ada pelanggan yang jatuh tempo saat ini. 🎉" : "Tidak ada data pada filter ini."}
            </Card>
          ) : (
            <ReminderList rows={shown.map(toView)} storeName={user.tenant.name} pointsMultiplier={pointsMultiplier} />
          )}

          {recentReturned.length > 0 && (
            <Card className="p-4">
              <p className="mb-2 text-sm font-semibold">Kembali servis setelah diingatkan</p>
              <ul className="divide-y text-sm">
                {recentReturned.slice(0, 10).map((r) => (
                  <li key={r.returnedTicketId + r.serviceName} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {r.customerName} · <span className="text-muted-foreground">{r.serviceName}</span>
                    </span>
                    <Link href={`/service/${r.returnedTicketId}`} className="text-xs font-medium text-primary hover:underline">
                      {r.returnedTicketNumber} · {formatLocalDate(r.returnedAt, { dateStyle: "medium" })}
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
