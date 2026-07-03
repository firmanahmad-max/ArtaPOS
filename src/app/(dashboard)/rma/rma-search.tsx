"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

/** Kotak cari klaim RMA (nomor / produk / SN / distributor) via query ?q=. */
export function RmaSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const [q, setQ] = useState(initial);

  return (
    <form
      className="relative w-full max-w-xs"
      onSubmit={(e) => {
        e.preventDefault();
        router.push(q ? `/rma?q=${encodeURIComponent(q)}` : "/rma");
      }}
    >
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Cari no / produk / SN / distributor…"
        className="pl-9"
      />
    </form>
  );
}
