"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { addServicePhotoAction, removeServicePhotoAction } from "@/server/service-jobs/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface ServicePhotoView {
  id: string;
  dataUrl: string;
  caption: string | null;
  createdAt: string;
}

/** Resize gambar di browser (maks 1000px sisi terpanjang) → JPEG dataURL. */
function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const max = 1000;
        let { width, height } = img;
        if (width > max || height > max) {
          const r = Math.min(max / width, max / height);
          width = Math.round(width * r);
          height = Math.round(height * r);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas tidak didukung"));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ServicePhotos({ ticketId, photos }: { ticketId: string; photos: ServicePhotoView[] }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const onFile = async (file: File) => {
    setError(null);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      start(async () => {
        const r = await addServicePhotoAction(ticketId, dataUrl, "");
        if (r.ok) router.refresh();
        else setError(r.message ?? "Gagal mengunggah.");
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memproses gambar.");
    }
  };

  const onDelete = (photoId: string) => {
    if (!confirm("Hapus foto ini?")) return;
    start(async () => {
      await removeServicePhotoAction(ticketId, photoId);
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>Foto Kondisi ({photos.length})</CardTitle>
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
        >
          {pending ? <Loader2 className="animate-spin" /> : <Camera />} Tambah Foto
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />
      </CardHeader>
      <CardContent>
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        {photos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada foto. Tambahkan foto kondisi perangkat saat diterima.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {photos.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.dataUrl} alt="Foto servis" className="aspect-square w-full object-cover" />
                <button
                  onClick={() => onDelete(p.id)}
                  className="absolute right-1 top-1 rounded-md bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
                  title="Hapus"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
