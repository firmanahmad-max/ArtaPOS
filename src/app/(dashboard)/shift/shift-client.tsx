"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, DoorOpen, DoorClosed } from "lucide-react";
import { openShiftAction, closeShiftAction } from "@/server/shift/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function OpenShiftForm() {
  const [state, action, pending] = useActionState(openShiftAction, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={action} className="space-y-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="openingCash">Modal Kas Awal (Rp)</Label>
        <Input id="openingCash" name="openingCash" type="number" min="0" defaultValue={0} />
        {state?.errors?.openingCash && (
          <p className="text-sm text-destructive">{state.errors.openingCash[0]}</p>
        )}
      </div>
      {state?.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <DoorOpen />} Buka Shift
      </Button>
    </form>
  );
}

export function CloseShiftForm({ shiftId }: { shiftId: string }) {
  const action = closeShiftAction.bind(null, shiftId);
  const [state, formAction, pending] = useActionState(action, undefined);
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2">
        <Label htmlFor="closingCash">Kas Tunai Dihitung (Rp)</Label>
        <Input id="closingCash" name="closingCash" type="number" min="0" defaultValue={0} />
        {state?.errors?.closingCash && (
          <p className="text-sm text-destructive">{state.errors.closingCash[0]}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Hitung uang tunai di laci, lalu masukkan jumlahnya untuk membandingkan dengan yang seharusnya.
        </p>
      </div>
      {state?.message && !state.ok && <p className="text-sm text-destructive">{state.message}</p>}
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <DoorClosed />} Tutup Shift
      </Button>
    </form>
  );
}
