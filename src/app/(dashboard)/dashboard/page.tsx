import type { Metadata } from "next";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/auth/dal";
import { ROLE_LABELS, can } from "@/lib/rbac";
import { daysFromNow, formatLocalDate } from "@/lib/timezone";
import { greeting } from "@/lib/dashboard-calc";
import { dailyKind } from "@/lib/daily-content";
import { getOpenShift } from "@/server/shift/service";
import { getReceiptStoreInfo } from "@/server/users/service";
import {
  ActionSection,
  BlockSkeleton,
  HeroShell,
  MonthKpisSection,
  OperationsSection,
  PerformanceSection,
  PulseSkeleton,
  TodayPulse,
} from "./sections";
import { DailyContentCard } from "./daily-content-card";
import { AssetsSection, ProgramsSection } from "./fold-sections";

export const metadata: Metadata = { title: "Dashboard" };

/**
 * Dashboard "Pusat Kendali Toko". Kerangka (hero, Konten Harian) tampil seketika;
 * bagian data dialirkan bertahap lewat Suspense (masing-masing gagal sendiri tanpa
 * menjatuhkan halaman). Bagian "Pelanggan & program" dan "Aset & inventaris" bisa
 * dilipat dan baru memuat data saat dibuka. Semua bagian mengikuti izin peran.
 */
export default async function DashboardPage() {
  const user = await getCurrentUser();
  const now = daysFromNow(0); // = sekarang (helper agar lolos aturan purity)
  const ctx = { tenantId: user.tenantId, role: user.role, now };
  const [shift, store] = await Promise.all([
    can(user.role, "pos.use") ? getOpenShift(user.tenantId, user.id).catch(() => null) : Promise.resolve(undefined),
    getReceiptStoreInfo(user.tenantId),
  ]);
  const dateLabel = formatLocalDate(new Date(now), { weekday: "long", day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <HeroShell
        greeting={greeting(now)}
        dateLabel={dateLabel.toUpperCase()}
        name={user.name.split(" ")[0]}
        roleLabel={ROLE_LABELS[user.role]}
        storeName={user.tenant.name}
        shiftOpen={shift === undefined ? null : !!shift}
        canPos={can(user.role, "pos.use")}
      >
        <Suspense fallback={<PulseSkeleton />}>
          <TodayPulse {...ctx} />
        </Suspense>
      </HeroShell>

      <Suspense fallback={<BlockSkeleton h="h-36" cols={4} />}>
        <ActionSection {...ctx} />
      </Suspense>

      <Suspense fallback={<BlockSkeleton h="h-36" cols={4} />}>
        <MonthKpisSection {...ctx} />
      </Suspense>

      <Suspense fallback={<BlockSkeleton h="h-[360px]" cols={2} />}>
        <PerformanceSection {...ctx} />
      </Suspense>

      <DailyContentCard
        now={now}
        defaultKind={dailyKind(now)}
        dateLabel={formatLocalDate(new Date(now), { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
        store={{
          name: user.tenant.name,
          logo: store.logo,
          phone: store.phone,
          footer: store.address ? store.address.split("\n")[0] : null,
        }}
      />

      <Suspense fallback={<BlockSkeleton h="h-72" cols={3} />}>
        <OperationsSection {...ctx} />
      </Suspense>

      {can(user.role, "reports.view") && <ProgramsSection />}
      {can(user.role, "inventory.manage") && <AssetsSection />}
    </div>
  );
}
