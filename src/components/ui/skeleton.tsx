import { cn } from "@/lib/utils";

/** Placeholder berdenyut untuk keadaan memuat. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  );
}
