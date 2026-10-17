import { Skeleton } from "@/components/ui/skeleton";

/** Kerangka saat berpindah ke Dashboard (bagian data dialirkan bertahap setelahnya). */
export default function DashboardLoading() {
  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <Skeleton className="h-56 w-full rounded-[22px]" />
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-[1.65fr_1fr]">
        <Skeleton className="h-[360px] rounded-2xl" />
        <Skeleton className="h-[360px] rounded-2xl" />
      </div>
    </div>
  );
}
