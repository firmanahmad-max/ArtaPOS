"use client";

import { useActionState } from "react";
import { Loader2, ClipboardCheck } from "lucide-react";
import { createOpnameAction } from "@/server/opname/actions";
import { Button } from "@/components/ui/button";

export function StartOpnameButton() {
  const [state, action, pending] = useActionState(createOpnameAction, undefined);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <ClipboardCheck />}
        Mulai Opname Baru
      </Button>
      {state?.message && <span className="text-sm text-destructive">{state.message}</span>}
    </form>
  );
}
