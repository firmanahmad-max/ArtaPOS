"use client";

import { useActionState, useEffect, useRef, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import type { FormState } from "@/lib/form";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConfirmButton } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface Contact {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
}

export function ContactManager({
  items,
  createAction,
  deleteAction,
  editBase,
  noun,
}: {
  items: Contact[];
  createAction: (prev: FormState, fd: FormData) => Promise<FormState>;
  deleteAction: (id: string) => Promise<void>;
  editBase: string; // mis. "/suppliers"
  noun: string; // mis. "Supplier" / "Pelanggan"
}) {
  const [state, action, pending] = useActionState(createAction, undefined);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [deleting, startDelete] = useTransition();

  useEffect(() => {
    if (state?.ok) {
      formRef.current?.reset();
      router.refresh();
    }
  }, [state, router]);

  const onDelete = (id: string, name: string) => {
    startDelete(async () => {
      await deleteAction(id);
      toast.success(`${noun} "${name}" dihapus`);
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Tambah {noun}</CardTitle>
        </CardHeader>
        <CardContent>
          <form ref={formRef} action={action} className="grid gap-3 sm:grid-cols-2">
            <Input name="name" placeholder={`Nama ${noun.toLowerCase()} *`} required />
            <Input name="phone" placeholder="No. telepon" />
            <Input name="email" type="email" placeholder="Email" />
            <Input name="address" placeholder="Alamat" />
            <div className="sm:col-span-2 flex items-center gap-3">
              <Button type="submit" disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Plus />} Tambah
              </Button>
              {state?.message && (
                <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>
                  {state.message}
                </span>
              )}
              {state?.errors?.email && (
                <span className="text-sm text-destructive">{state.errors.email[0]}</span>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="overflow-x-auto">
        {items.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Belum ada {noun.toLowerCase()}.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="p-3 font-medium">Nama</th>
                <th className="p-3 font-medium">Kontak</th>
                <th className="p-3 font-medium">Alamat</th>
                <th className="p-3 text-right font-medium">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/40">
                  <td className="p-3 font-medium">{c.name}</td>
                  <td className="p-3 text-muted-foreground">
                    {c.phone || "—"}
                    {c.email ? <div className="text-xs">{c.email}</div> : null}
                  </td>
                  <td className="p-3 text-muted-foreground">{c.address || "—"}</td>
                  <td className="p-3">
                    <div className="flex items-center justify-end gap-1">
                      <Link
                        href={`${editBase}/${c.id}/edit`}
                        className={buttonVariants({ variant: "ghost", size: "icon" })}
                        title="Edit"
                      >
                        <Pencil />
                      </Link>
                      <ConfirmButton
                        variant="ghost"
                        size="icon"
                        disabled={deleting}
                        destructive
                        onConfirm={() => onDelete(c.id, c.name)}
                        title={`Hapus ${noun.toLowerCase()} "${c.name}"?`}
                        description="Data akan dinonaktifkan."
                        confirmText="Ya, hapus"
                      >
                        {deleting ? <Loader2 className="animate-spin" /> : <Trash2 className="text-destructive" />}
                      </ConfirmButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
