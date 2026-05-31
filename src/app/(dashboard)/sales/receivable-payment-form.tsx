"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, HandCoins } from "lucide-react";
import { recordSalePaymentAction } from "@/server/pos/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function ReceivablePaymentForm({ saleId, outstanding }: { saleId: string; outstanding: number }) {
  const action = recordSalePaymentAction.bind(null, saleId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state?.ok, router]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="flex flex-1 flex-col gap-2">
          <Label htmlFor="amount">Jumlah Bayar (maks {outstanding.toLocaleString("id-ID")})</Label>
          <Input id="amount" name="amount" type="number" min="1" max={outstanding} placeholder="0" required />
        </div>
        <div className="flex flex-[2] flex-col gap-2">
          <Label htmlFor="note">Catatan</Label>
          <Input id="note" name="note" placeholder="mis. cicilan ke-1" />
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <HandCoins />} Terima
        </Button>
      </div>
      {state?.errors?.amount && <p className="text-sm text-destructive">{state.errors.amount[0]}</p>}
      {state?.message && (
        <p className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</p>
      )}
    </form>
  );
}
