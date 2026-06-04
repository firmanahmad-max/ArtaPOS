"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ban, Loader2 } from "lucide-react";
import { voidSaleAction } from "@/server/pos/actions";
import { ConfirmButton } from "@/components/ui/confirm-dialog";

export function VoidSaleButton({ saleId, number }: { saleId: string; number: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const onConfirm = () => {
    start(async () => {
      const r = await voidSaleAction(saleId);
      if (r.ok) {
        toast.success(`Transaksi ${number} dibatalkan`, { description: "Stok telah dikembalikan." });
        router.refresh();
      } else {
        toast.error("Gagal membatalkan", { description: r.message ?? undefined });
      }
    });
  };

  return (
    <ConfirmButton
      variant="destructive"
      disabled={pending}
      onConfirm={onConfirm}
      destructive
      title={`Batalkan transaksi ${number}?`}
      description="Stok akan dikembalikan. Tindakan ini tidak bisa diurungkan."
      confirmText="Ya, batalkan"
    >
      {pending ? <Loader2 className="animate-spin" /> : <Ban />} Batalkan Transaksi
    </ConfirmButton>
  );
}
