"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Link2, Loader2 } from "lucide-react";
import { linkHistoryByPhoneAction } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";

/** Cocokkan tiket servis lama (tanpa pelanggan) ke member lewat No. HP. */
export function LinkHistoryButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await linkHistoryByPhoneAction();
          if (r.ok) {
            toast.success(r.message ?? "Selesai");
            router.refresh();
          } else toast.error(r.message ?? "Gagal.");
        })
      }
      title="Tiket servis lama yang No. HP-nya sama dengan member akan ditautkan (tanpa membuat member baru)"
    >
      {pending ? <Loader2 className="animate-spin" /> : <Link2 />} Tautkan riwayat lama
    </Button>
  );
}
