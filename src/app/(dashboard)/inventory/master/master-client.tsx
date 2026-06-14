"use client";

import { useActionState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { createCategoryAction, createUnitAction } from "@/server/inventory/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AddCategoryForm() {
  const [state, action, pending] = useActionState(createCategoryAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  // Depend pada objek `state` (bukan `state?.ok`) agar refresh juga jalan
  // saat membuat berturut-turut — `ok` tetap true tiap sukses, objeknya baru.
  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2 sm:flex-row">
      <Input name="name" placeholder="Nama kategori (mis. Laptop)" required className="flex-1" />
      <Input name="description" placeholder="Deskripsi (opsional)" className="flex-1" />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
      </Button>
      {state?.message && !state.ok && (
        <p className="text-sm text-destructive sm:self-center">{state.message}</p>
      )}
    </form>
  );
}

export function AddUnitForm() {
  const [state, action, pending] = useActionState(createUnitAction, undefined);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.ok) {
      ref.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  return (
    <form ref={ref} action={action} className="flex flex-col gap-2 sm:flex-row">
      <Input name="name" placeholder="Nama satuan (mis. Pcs)" required className="flex-1" />
      <Input name="symbol" placeholder="Simbol (mis. pcs)" className="flex-1" />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
      </Button>
      {state?.message && !state.ok && (
        <p className="text-sm text-destructive sm:self-center">{state.message}</p>
      )}
    </form>
  );
}
