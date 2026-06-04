"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition, useState } from "react";
import { toast } from "sonner";
import { Search, Trash2, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ConfirmButton } from "@/components/ui/confirm-dialog";
import { deactivateProductAction } from "@/server/inventory/actions";

/** Kotak pencarian produk — memperbarui query param ?q= */
export function SearchBox({ initial }: { initial: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = new URLSearchParams(params.toString());
    if (value.trim()) next.set("q", value.trim());
    else next.delete("q");
    startTransition(() => router.push(`/inventory?${next.toString()}`));
  };

  return (
    <form onSubmit={submit} className="relative flex-1 sm:max-w-xs">
      <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Cari nama / SKU / barcode…"
        className="pl-9"
      />
      {pending && (
        <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      )}
    </form>
  );
}

/** Tombol hapus (nonaktifkan) produk dengan konfirmasi. */
export function DeleteProductButton({ id, name }: { id: string; name: string }) {
  const [pending, startTransition] = useTransition();

  const onConfirm = () => {
    startTransition(async () => {
      await deactivateProductAction(id);
      toast.success(`Produk "${name}" dinonaktifkan`);
    });
  };

  return (
    <ConfirmButton
      variant="ghost"
      size="icon"
      disabled={pending}
      destructive
      onConfirm={onConfirm}
      title={`Hapus produk "${name}"?`}
      confirmText="Ya, nonaktifkan"
      description="Produk akan dinonaktifkan. Riwayat stok tetap tersimpan."
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
    </ConfirmButton>
  );
}
