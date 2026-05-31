"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, CheckCircle2 } from "lucide-react";
import {
  saveOpnameCountsAction,
  completeOpnameAction,
} from "@/server/opname/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";

export interface OpnameItem {
  id: string;
  productName: string;
  systemQty: number;
  countedQty: number;
}

export function OpnameSheet({
  opnameId,
  status,
  items,
}: {
  opnameId: string;
  status: string;
  items: OpnameItem[];
}) {
  const router = useRouter();
  const isDraft = status === "DRAFT";
  const [counts, setCounts] = useState<Record<string, number>>(
    Object.fromEntries(items.map((i) => [i.id, i.countedQty])),
  );
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSave] = useTransition();
  const [completing, startComplete] = useTransition();

  const payload = () =>
    items.map((i) => ({ itemId: i.id, countedQty: counts[i.id] ?? 0 }));

  const onSave = () =>
    startSave(async () => {
      const r = await saveOpnameCountsAction(opnameId, payload());
      setMsg({ ok: r.ok, text: r.message ?? "" });
      if (r.ok) router.refresh();
    });

  const onComplete = () => {
    if (!confirm("Selesaikan opname? Stok akan disesuaikan sesuai hasil hitung dan tidak bisa diubah lagi.")) return;
    startComplete(async () => {
      const save = await saveOpnameCountsAction(opnameId, payload());
      if (!save.ok) {
        setMsg({ ok: false, text: save.message ?? "Gagal menyimpan." });
        return;
      }
      const r = await completeOpnameAction(opnameId);
      setMsg({ ok: r.ok, text: r.message ?? "" });
      if (r.ok) {
        router.push("/inventory/opname");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-4">
      <Card className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="p-3 font-medium">Produk</th>
              <th className="p-3 text-center font-medium">Stok Sistem</th>
              <th className="p-3 text-center font-medium">Hitung Fisik</th>
              <th className="p-3 text-center font-medium">Selisih</th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => {
              const counted = counts[i.id] ?? 0;
              const diff = counted - i.systemQty;
              return (
                <tr key={i.id} className="border-b last:border-0">
                  <td className="p-3 font-medium">{i.productName}</td>
                  <td className="p-3 text-center text-muted-foreground">{i.systemQty}</td>
                  <td className="p-3 text-center">
                    {isDraft ? (
                      <Input
                        type="number"
                        value={counted}
                        onChange={(e) =>
                          setCounts((c) => ({ ...c, [i.id]: Number(e.target.value) }))
                        }
                        className="mx-auto h-9 w-24 text-center"
                      />
                    ) : (
                      <span>{counted}</span>
                    )}
                  </td>
                  <td className="p-3 text-center font-medium">
                    {diff === 0 ? (
                      <span className="text-muted-foreground">0</span>
                    ) : diff > 0 ? (
                      <span className="text-success">+{diff}</span>
                    ) : (
                      <span className="text-destructive">{diff}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>

      {msg && (
        <p
          className={
            msg.ok
              ? "rounded-md bg-success/10 px-3 py-2 text-sm text-success"
              : "rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          }
        >
          {msg.text}
        </p>
      )}

      {isDraft && (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={onSave} disabled={saving || completing}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Simpan Hitungan
          </Button>
          <Button onClick={onComplete} disabled={saving || completing}>
            {completing ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Selesaikan & Terapkan
          </Button>
        </div>
      )}
    </div>
  );
}
