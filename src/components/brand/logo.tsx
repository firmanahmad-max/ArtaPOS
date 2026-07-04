import { cn } from "@/lib/utils";

/**
 * Logo ArtaPOS — ikon brand (tile ungu ber-sudut membulat, sudut transparan
 * sehingga menyatu di semua tema terang/gelap). Ukuran diatur via `size`.
 */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/icon-512.png"
      alt="ArtaPOS"
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cn("shrink-0 select-none object-contain", className)}
      draggable={false}
    />
  );
}
