import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAME } from "@/lib/brand";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-md">{children}</div>
      <div className="mt-6 flex items-center gap-3 text-xs text-muted-foreground">
        <Link href="/about" className="hover:text-foreground hover:underline">Tentang {APP_NAME}</Link>
        <span>·</span>
        <Link href="/disclaimer" className="hover:text-foreground hover:underline">Disclaimer</Link>
      </div>
    </div>
  );
}
