import { cn } from "@/lib/utils";
import { APP_FULL } from "@/lib/brand";

/**
 * Logo horizontal ArtaPOS (mark + wordmark + tagline) — latar transparan,
 * menyatu di semua tema. Ukuran diatur via className (mis. `h-16 w-auto`).
 */
export function LogoWordmark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo-wordmark.png"
      alt={APP_FULL}
      className={cn("select-none object-contain", className)}
      draggable={false}
    />
  );
}
