"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Upload, CheckCircle2 } from "lucide-react";
import { importProductsAction } from "@/server/inventory/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const TEMPLATE = `nama,sku,barcode,kategori,satuan,modal,jual,stok,minstok,garansi
RAM DDR4 8GB,RAM-DDR4-8,8990001112223,Komponen,Pcs,350000,450000,20,5,12
Mouse Wireless,MOU-WL-01,,Aksesoris,Pcs,40000,75000,50,10,3
Keyboard Mekanik,KEY-MEK-01,,Aksesoris,Pcs,250000,399000,15,3,6`;

interface ImportState {
  ok: boolean;
  message?: string;
  created?: number;
  errors?: { row: number; message: string }[];
}

export function ImportClient() {
  const router = useRouter();
  const [text, setText] = useState("");
  const [result, setResult] = useState<ImportState | null>(null);
  const [pending, start] = useTransition();

  const submit = () => {
    setResult(null);
    start(async () => {
      const r = await importProductsAction(text);
      setResult(r);
      if (r.ok && (r.created ?? 0) > 0) router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md bg-muted p-3 text-xs">
        <p className="mb-1 font-medium">Format CSV (baris pertama = header):</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{TEMPLATE}</pre>
        <p className="mt-2 text-muted-foreground">
          Wajib: <b>nama</b> &amp; <b>sku</b>. Kategori/satuan dibuat otomatis bila belum ada.
          Angka boleh pakai titik (mis. 1.000.000). Kolom boleh dikosongkan.
        </p>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setText(TEMPLATE)}>
          Isi contoh
        </Button>
      </div>

      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Tempel data CSV di sini…"
        className="min-h-48 font-mono text-xs"
      />

      <Button onClick={submit} disabled={pending || !text.trim()}>
        {pending ? <Loader2 className="animate-spin" /> : <Upload />} Import Produk
      </Button>

      {result && (
        <div className="space-y-2">
          {result.message && !result.ok && (
            <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{result.message}</p>
          )}
          {result.ok && (
            <div className="flex items-center gap-2 rounded-md bg-success/10 px-3 py-2 text-sm text-success">
              <CheckCircle2 className="size-4" /> {result.created} produk berhasil diimpor.
            </div>
          )}
          {result.errors && result.errors.length > 0 && (
            <div className="rounded-md border p-3 text-sm">
              <p className="mb-1 font-medium text-destructive">{result.errors.length} baris gagal:</p>
              <ul className="space-y-0.5 text-muted-foreground">
                {result.errors.map((e, i) => (
                  <li key={i}>Baris {e.row}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
