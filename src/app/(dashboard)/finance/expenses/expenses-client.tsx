"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { createExpenseAction, deleteExpenseAction } from "@/server/finance/actions";
import { EXPENSE_CATEGORIES } from "@/lib/validations/finance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export function AddExpenseForm() {
  const [state, action, pending] = useActionState(createExpenseAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state?.ok, router]);

  return (
    <form ref={ref} action={action} className="grid gap-3 sm:grid-cols-4">
      <Select name="category" defaultValue="Operasional" className="h-9">
        {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
      </Select>
      <Input name="description" placeholder="Keterangan (opsional)" />
      <Input name="amount" type="number" min="1" placeholder="Jumlah (Rp)" required />
      <Input name="date" type="date" />
      <div className="sm:col-span-4 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Plus />} Catat Biaya
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
        {state?.errors?.amount && <span className="text-sm text-destructive">{state.errors.amount[0]}</span>}
      </div>
    </form>
  );
}

export function DeleteExpenseButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="icon"
      disabled={pending}
      onClick={() => {
        if (!confirm("Hapus biaya ini?")) return;
        start(async () => {
          await deleteExpenseAction(id);
          router.refresh();
        });
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
    </Button>
  );
}
