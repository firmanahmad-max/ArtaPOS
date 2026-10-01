"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, X, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRupiah } from "@/lib/utils";
import {
  saveGalleryItemAction,
  deleteGalleryItemAction,
  toggleGalleryItemAction,
} from "@/server/gallery/actions";

export interface GalleryRow {
  id: string;
  productId: string | null;
  title: string;
  spec: string | null;
  price: number;
  photo: string | null;
  label: string | null;
  isActive: boolean;
}
interface ProductOpt {
  id: string;
  name: string;
  sellPrice: number;
}
type Form = {
  id?: string;
  productId: string;
  title: string;
  spec: string;
  price: number;
  photo: string | null;
  label: string;
  isActive: boolean;
};

const BLANK: Form = { productId: "", title: "", spec: "", price: 0, photo: null, label: "", isActive: true };
const LABELS = ["Promo", "Baru", "Unggulan", "Diskon", "Terlaris"];

function compressImage(file: File, maxDim = 1000, quality = 0.72): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width >= height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Gagal memproses gambar."));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("Gambar tidak valid."));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("Gagal membaca berkas."));
    reader.readAsDataURL(file);
  });
}

export function GalleryManager({
  items,
  products,
}: {
  items: GalleryRow[];
  products: ProductOpt[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function startNew() {
    setForm({ ...BLANK });
  }
  function startEdit(it: GalleryRow) {
    setForm({
      id: it.id,
      productId: it.productId ?? "",
      title: it.title,
      spec: it.spec ?? "",
      price: it.price,
      photo: it.photo,
      label: it.label ?? "",
      isActive: it.isActive,
    });
  }
  function patch(p: Partial<Form>) {
    setForm((f) => (f ? { ...f, ...p } : f));
  }

  function onPickProduct(id: string) {
    const p = products.find((x) => x.id === id);
    patch({
      productId: id,
      ...(p && !form?.title ? { title: p.name } : {}),
      ...(p && (!form?.price || form.price === 0) ? { price: p.sellPrice } : {}),
    });
  }

  async function onPhoto(file?: File) {
    if (!file) return;
    try {
      const data = await compressImage(file);
      patch({ photo: data });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat foto.");
    }
  }

  async function save() {
    if (!form) return;
    if (!form.title.trim() && !form.productId) {
      toast.error("Isi judul atau pilih produk dulu.");
      return;
    }
    setSaving(true);
    const r = await saveGalleryItemAction({
      id: form.id,
      productId: form.productId || null,
      title: form.title,
      spec: form.spec || null,
      price: form.price,
      photo: form.photo, // dataUrl / null
      label: form.label || null,
      isActive: form.isActive,
    });
    setSaving(false);
    if (r.ok) {
      toast.success(form.id ? "Pajangan diperbarui" : "Pajangan ditambahkan");
      setForm(null);
      router.refresh();
    } else {
      toast.error(r.message ?? "Gagal menyimpan.");
    }
  }

  async function remove(it: GalleryRow) {
    if (!confirm(`Hapus "${it.title}" dari galeri?`)) return;
    const r = await deleteGalleryItemAction(it.id);
    if (r.ok) {
      toast.success("Dihapus");
      router.refresh();
    } else toast.error(r.message ?? "Gagal menghapus.");
  }

  async function toggle(it: GalleryRow) {
    const r = await toggleGalleryItemAction(it.id, !it.isActive);
    if (r.ok) router.refresh();
    else toast.error(r.message ?? "Gagal mengubah status.");
  }

  return (
    <div className="space-y-5">
      {!form && (
        <Button onClick={startNew}>
          <Plus /> Tambah Pajangan
        </Button>
      )}

      {/* Form tambah/edit */}
      {form && (
        <Card className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">{form.id ? "Ubah Pajangan" : "Pajangan Baru"}</h2>
            <Button variant="ghost" size="icon" onClick={() => setForm(null)} aria-label="Tutup">
              <X className="size-4" />
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-[180px_1fr]">
            {/* Foto */}
            <div className="space-y-2">
              <Label>Foto</Label>
              <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl border bg-muted/40">
                {form.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.photo} alt="Pratinjau" className="size-full object-cover" />
                ) : (
                  <span className="px-2 text-center text-xs text-muted-foreground">Belum ada foto</span>
                )}
                {form.photo && (
                  <button
                    type="button"
                    onClick={() => patch({ photo: null })}
                    className="absolute right-1.5 top-1.5 rounded-md bg-background/90 p-1 text-destructive shadow"
                    aria-label="Hapus foto"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => onPhoto(e.target.files?.[0])}
              />
              <Button type="button" variant="outline" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
                <ImagePlus className="size-4" /> {form.photo ? "Ganti foto" : "Unggah foto"}
              </Button>
            </div>

            {/* Detail */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="g-prod">Tautkan produk (opsional)</Label>
                <Select id="g-prod" value={form.productId} onChange={(e) => onPickProduct(e.target.value)}>
                  <option value="">— Tanpa produk (isi manual) —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} · {formatRupiah(p.sellPrice)}
                    </option>
                  ))}
                </Select>
                <p className="text-xs text-muted-foreground">Memilih produk mengisi judul &amp; harga otomatis (masih bisa diubah).</p>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-title">Judul</Label>
                <Input id="g-title" value={form.title} onChange={(e) => patch({ title: e.target.value })} placeholder="mis. Laptop Asus VivoBook 14" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="g-price">Harga (Rp)</Label>
                  <Input
                    id="g-price"
                    inputMode="numeric"
                    value={form.price ? String(form.price) : ""}
                    onChange={(e) => patch({ price: Number(e.target.value.replace(/[^0-9]/g, "")) || 0 })}
                    placeholder="0 = Hubungi"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-label">Label/Badge</Label>
                  <Input id="g-label" value={form.label} onChange={(e) => patch({ label: e.target.value })} placeholder="mis. Promo" maxLength={24} />
                  <div className="flex flex-wrap gap-1.5">
                    {LABELS.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => patch({ label: form.label === l ? "" : l })}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-xs transition-colors",
                          form.label === l ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:border-primary/50",
                        )}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="g-spec">Spesifikasi / deskripsi</Label>
                <Textarea
                  id="g-spec"
                  rows={3}
                  value={form.spec}
                  onChange={(e) => patch({ spec: e.target.value })}
                  placeholder="mis. Intel i5, RAM 8GB, SSD 512GB, layar 14&quot; FHD"
                />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.isActive} onChange={(e) => patch({ isActive: e.target.checked })} className="size-4 accent-[var(--primary)]" />
                Tampilkan di galeri publik
              </label>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={save} disabled={saving}>
              {saving ? <Loader2 className="animate-spin" /> : null} Simpan
            </Button>
            <Button variant="outline" onClick={() => setForm(null)}>
              Batal
            </Button>
          </div>
        </Card>
      )}

      {/* Daftar pajangan */}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada pajangan. Tekan <strong>Tambah Pajangan</strong> untuk mulai mengisi etalase.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => (
            <Card key={it.id} className={cn("flex flex-col overflow-hidden", !it.isActive && "opacity-60")}>
              <div className="relative aspect-video bg-muted/40">
                {it.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photo} alt={it.title} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Tanpa foto</div>
                )}
                {it.label && <Badge className="absolute left-2 top-2 gradient-brand text-primary-foreground">{it.label}</Badge>}
                {!it.isActive && <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Nonaktif</span>}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                <p className="line-clamp-1 font-semibold">{it.title}</p>
                {it.spec && <p className="line-clamp-2 text-xs text-muted-foreground">{it.spec}</p>}
                <p className="mt-1 font-mono font-bold tabular-nums text-primary">
                  {it.price > 0 ? formatRupiah(it.price) : "Hubungi"}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => startEdit(it)}>
                    <Pencil className="size-3.5" /> Ubah
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(it)}>
                    {it.isActive ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
                    {it.isActive ? "Sembunyikan" : "Tampilkan"}
                  </Button>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(it)} aria-label="Hapus">
                    <Trash2 className="size-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
