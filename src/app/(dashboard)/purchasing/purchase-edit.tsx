"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2 } from "lucide-react";
import {
  updatePurchaseHeaderAction,
  deletePurchaseAction,
  deletePurchasePaymentAction,
} from "@/server/purchasing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

interface SupplierOpt {
  id: string;
  name: string;
}

/** Form edit HEADER pembelian: supplier, jatuh tempo, catatan (tanpa item/stok). */
export function PurchaseHeaderForm({
  purchaseId,
  suppliers,
  initial,
}: {
  purchaseId: string;
  suppliers: SupplierOpt[];
  initial: { supplierId: string | null; dueDate: string | null; note: string | null };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [supplierId, setSupplierId] = useState(initial.supplierId ?? "");
  const [dueDate, setDueDate] = useState(initial.dueDate ?? "");
  const [note, setNote] = useState(initial.note ?? "");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const r = await updatePurchaseHeaderAction(purchaseId, {
        supplierId: supplierId || null,
        dueDate: dueDate || null,
        note: note || null,
      });
      setMsg({ ok: r.ok, text: r.message ?? "" });
      if (r.ok) router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-supplier">Supplier</Label>
          <Select id="edit-supplier" value={supplierId} onChange={(e) => setSupplierId(e.target.value)}>
            <option value="">— Tanpa supplier —</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="edit-due">Jatuh tempo</Label>
          <Input id="edit-due" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="edit-note">Catatan</Label>
        <Input id="edit-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan (opsional)" maxLength={255} />
      </div>
      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Perubahan
        </Button>
        {msg && <span className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</span>}
      </div>
    </div>
  );
}

/** Tombol hapus seluruh pembelian (koreksi salah input). Redirect setelah sukses. */
export function DeletePurchaseButton({
  purchaseId,
  number,
  hasPayments,
}: {
  purchaseId: string;
  number: string;
  hasPayments: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function onDelete() {
    const warn = hasPayments
      ? `Hapus pembelian ${number}? Stok yang ditambahkan akan dikembalikan dan SEMUA pembayaran yang tercatat pada pembelian ini ikut terhapus. Tindakan ini tidak bisa dibatalkan.`
      : `Hapus pembelian ${number}? Stok yang ditambahkan akan dikembalikan. Tindakan ini tidak bisa dibatalkan.`;
    if (!confirm(warn)) return;
    setErr(null);
    start(async () => {
      const r = await deletePurchaseAction(purchaseId);
      if (r.ok) {
        router.push("/purchasing");
        router.refresh();
      } else {
        setErr(r.message ?? "Gagal menghapus.");
      }
    });
  }

  return (
    <div className="space-y-2">
      <Button variant="destructive" onClick={onDelete} disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : <Trash2 />} Hapus Pembelian
      </Button>
      {err && <p className="text-sm text-destructive">{err}</p>}
    </div>
  );
}

/** Tombol hapus satu baris pembayaran utang. */
export function DeletePaymentButton({ purchaseId, paymentId }: { purchaseId: string; paymentId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  function onDelete() {
    if (!confirm("Hapus pembayaran ini? Sisa utang akan dihitung ulang.")) return;
    start(async () => {
      const r = await deletePurchasePaymentAction(purchaseId, paymentId);
      if (r.ok) router.refresh();
      else alert(r.message ?? "Gagal menghapus pembayaran.");
    });
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="size-7 shrink-0"
      onClick={onDelete}
      disabled={pending}
      title="Hapus pembayaran"
    >
      {pending ? <Loader2 className="size-3 animate-spin" /> : <Trash2 className="size-3 text-destructive" />}
    </Button>
  );
}
