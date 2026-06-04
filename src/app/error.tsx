"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="mb-5 flex size-16 items-center justify-center rounded-2xl bg-destructive/15 text-destructive">
        <AlertTriangle className="size-8" />
      </div>
      <h1 className="text-xl font-bold">Terjadi kesalahan</h1>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">
        Maaf, ada yang tidak beres saat memuat halaman ini. Coba muat ulang, atau
        kembali ke dashboard.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground/70">
          Kode: {error.digest}
        </p>
      )}
      <div className="mt-6 flex gap-2">
        <Button onClick={reset}>
          <RotateCcw /> Coba lagi
        </Button>
        <Link href="/dashboard" className={buttonVariants({ variant: "outline" })}>
          <Home /> Ke Dashboard
        </Link>
      </div>
    </div>
  );
}
