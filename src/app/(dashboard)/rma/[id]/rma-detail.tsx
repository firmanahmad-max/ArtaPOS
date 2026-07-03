"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackageCheck, PackageX, Undo2, Save } from "lucide-react";
import { receiveRmaAction, rejectRmaAction, reopenRmaAction, updateRmaNoteAction } from "@/server/rma/actions";
import type { RmaStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function RmaDetail({
  claimId,
  status,
  note,
}: {
  claimId: string;
  status: RmaStatus;
  note: string | null;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form terima kembali
  const [resolution, setResolution] = useState("REPAIRED");
  const [receivedAt, setReceivedAt] = useState(todayLocal());
  const [replacementSn, setReplacementSn] = useState("");
  const [receiveNote, setReceiveNote] = useState("");

  // Catatan
  const [noteDraft, setNoteDraft] = useState(note ?? "");

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null);
    start(async () => {
      const r = await fn();
      if (r.ok) router.refresh();
      else setError(r.message ?? "Gagal.");
    });
  };

  return (
    <div className="space-y-6">
      {status === "SENT" ? (
        <Card>
          <CardHeader>
            <CardTitle>Tandai Diterima Kembali</CardTitle>
            <CardDescription>Isi hasil klaim saat barang kembali dari distributor.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-2">
                <Label htmlFor="resolution">Hasil Klaim *</Label>
                <Select id="resolution" value={resolution} onChange={(e) => setResolution(e.target.value)}>
                  <option value="REPAIRED">Diservis / diperbaiki</option>
                  <option value="REPLACED">Ganti unit baru</option>
                  <option value="REFUNDED">Refund / nota kredit</option>
                </Select>
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="receivedAt">Tanggal Diterima</Label>
                <Input id="receivedAt" type="date" value={receivedAt} onChange={(e) => setReceivedAt(e.target.value)} />
              </div>
              {resolution === "REPLACED" && (
                <div className="flex flex-col gap-2 sm:col-span-2">
                  <Label htmlFor="replacementSn">SN Unit Pengganti</Label>
                  <Input
                    id="replacementSn"
                    value={replacementSn}
                    onChange={(e) => setReplacementSn(e.target.value)}
                    placeholder="Nomor seri unit baru dari distributor"
                  />
                </div>
              )}
              <div className="flex flex-col gap-2 sm:col-span-2">
                <Label htmlFor="receiveNote">Catatan Hasil</Label>
                <Textarea
                  id="receiveNote"
                  rows={2}
                  value={receiveNote}
                  onChange={(e) => setReceiveNote(e.target.value)}
                  placeholder="Opsional, mis. hasil pengecekan distributor…"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                disabled={pending}
                onClick={() =>
                  run(() =>
                    receiveRmaAction(claimId, {
                      resolution,
                      receivedAt,
                      replacementSn: replacementSn || undefined,
                      note: receiveNote || undefined,
                    }),
                  )
                }
              >
                {pending ? <Loader2 className="animate-spin" /> : <PackageCheck />} Simpan — Barang Kembali
              </Button>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => {
                  if (!confirm("Tandai klaim DITOLAK distributor?")) return;
                  run(() => rejectRmaAction(claimId, receiveNote || undefined));
                }}
              >
                <PackageX /> Klaim Ditolak
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <p className="text-sm text-muted-foreground">
              Klaim sudah {status === "RETURNED" ? "selesai (barang kembali)" : "ditandai ditolak"}. Salah tandai?
            </p>
            <Button
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => run(() => reopenRmaAction(claimId))}
            >
              <Undo2 /> Buka Lagi (kembali ke &quot;Di Distributor&quot;)
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Catatan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Catatan internal klaim ini…" />
          <Button
            variant="outline"
            size="sm"
            disabled={pending || noteDraft === (note ?? "")}
            onClick={() => run(() => updateRmaNoteAction(claimId, noteDraft))}
          >
            <Save /> Simpan Catatan
          </Button>
        </CardContent>
      </Card>

      {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
    </div>
  );
}
