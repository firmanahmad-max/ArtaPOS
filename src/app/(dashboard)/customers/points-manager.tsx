"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Coins } from "lucide-react";
import { adjustPointsAction } from "@/server/customers/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export interface PointEntryView {
  id: string;
  points: number;
  type: string;
  note: string | null;
  createdAt: string;
}

const TYPE_LABEL: Record<string, string> = { EARN: "Belanja", REDEEM: "Tukar", ADJUST: "Penyesuaian" };

export function PointsManager({
  customerId,
  balance,
  entries,
}: {
  customerId: string;
  balance: number;
  entries: PointEntryView[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [type, setType] = useState<"REDEEM" | "ADJUST">("REDEEM");
  const [points, setPoints] = useState(0);
  const [note, setNote] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = () => {
    setMsg(null);
    start(async () => {
      const r = await adjustPointsAction(customerId, points, type, note);
      if (r.ok) {
        setMsg({ ok: true, text: `Berhasil. Saldo poin: ${r.balance}` });
        setPoints(0);
        setNote("");
        router.refresh();
      } else {
        setMsg({ ok: false, text: r.message ?? "Gagal" });
      }
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2"><Coins className="size-5 text-amber-500" /> Poin Loyalitas</CardTitle>
        <CardDescription>Saldo poin: <span className="text-lg font-bold text-foreground">{balance}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Aksi</label>
            <Select value={type} onChange={(e) => setType(e.target.value as "REDEEM" | "ADJUST")} className="h-9 sm:w-40">
              <option value="REDEEM">Tukar Poin</option>
              <option value="ADJUST">Tambah/Sesuaikan</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">Jumlah Poin</label>
            <Input type="number" min="1" value={points || ""} onChange={(e) => setPoints(Math.max(0, Number(e.target.value)))} className="h-9 sm:w-28" />
          </div>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan" className="h-9 flex-1" />
          <Button onClick={submit} disabled={pending || points <= 0} className="h-9">
            {pending && <Loader2 className="animate-spin" />} Terapkan
          </Button>
        </div>
        {msg && <p className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}

        {entries.length > 0 && (
          <div className="rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="p-2 font-medium">Tanggal</th>
                  <th className="p-2 font-medium">Jenis</th>
                  <th className="p-2 font-medium">Catatan</th>
                  <th className="p-2 text-right font-medium">Poin</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b last:border-0">
                    <td className="p-2 text-muted-foreground">{new Date(e.createdAt).toLocaleDateString("id-ID", { dateStyle: "short" })}</td>
                    <td className="p-2">{TYPE_LABEL[e.type] ?? e.type}</td>
                    <td className="p-2 text-muted-foreground">{e.note || "—"}</td>
                    <td className={`p-2 text-right font-medium ${e.points >= 0 ? "text-success" : "text-destructive"}`}>
                      {e.points >= 0 ? "+" : ""}{e.points}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
