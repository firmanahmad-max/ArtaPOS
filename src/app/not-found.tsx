import Link from "next/link";
import { Compass, Home } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <Logo size={56} className="mb-5" />
      <div className="flex items-center gap-2 text-muted-foreground">
        <Compass className="size-5" />
        <span className="text-sm font-medium">Halaman tidak ditemukan</span>
      </div>
      <h1 className="mt-2 text-4xl font-bold tracking-tight">404</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Alamat yang Anda tuju tidak ada atau sudah dipindahkan.
      </p>
      <Link href="/dashboard" className={`mt-6 ${buttonVariants()}`}>
        <Home /> Kembali ke Dashboard
      </Link>
    </div>
  );
}
