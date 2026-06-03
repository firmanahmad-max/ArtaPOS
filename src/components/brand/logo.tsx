import { cn } from "@/lib/utils";

/** Logo ArtaPOS — kotak membulat bergradien brand + huruf "A". Mengikuti tema. */
export function Logo({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="artaLogoGradient" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--primary)" />
          <stop offset="1" stopColor="var(--primary-accent)" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="url(#artaLogoGradient)" />
      <g stroke="white" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M12.5 30 L20 10.5 L27.5 30" />
        <path d="M15.7 23.5 H24.3" />
      </g>
    </svg>
  );
}
