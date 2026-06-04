import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Paginasi sederhana berbasis link (server-friendly).
 * `basePath` + query lain digabung; param `page` ditambahkan.
 */
export function Pagination({
  page,
  totalPages,
  basePath,
  params = {},
}: {
  page: number;
  totalPages: number;
  basePath: string;
  params?: Record<string, string | undefined>;
}) {
  if (totalPages <= 1) return null;

  const href = (p: number) => {
    const sp = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
    sp.set("page", String(p));
    return `${basePath}?${sp.toString()}`;
  };

  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <div className="flex items-center justify-between gap-2">
      <p className="text-sm text-muted-foreground">
        Halaman <span className="font-medium text-foreground">{page}</span> dari {totalPages}
      </p>
      <div className="flex gap-2">
        <Link
          href={prevDisabled ? "#" : href(page - 1)}
          aria-disabled={prevDisabled}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            prevDisabled && "pointer-events-none opacity-50",
          )}
        >
          <ChevronLeft /> Sebelumnya
        </Link>
        <Link
          href={nextDisabled ? "#" : href(page + 1)}
          aria-disabled={nextDisabled}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            nextDisabled && "pointer-events-none opacity-50",
          )}
        >
          Berikutnya <ChevronRight />
        </Link>
      </div>
    </div>
  );
}
