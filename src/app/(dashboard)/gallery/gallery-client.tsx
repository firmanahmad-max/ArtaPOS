"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, ImagePlus, X, Eye, EyeOff, Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn, formatRupiah } from "@/lib/utils";
import { resolveFacets } from "@/lib/gallery-filter";
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
  /** Isian toko untuk filter publik (null = otomatis). */
  category: string | null;
  brand: string | null;
  /** Kategori dari sumber tertaut (produk/titipan/bekas) — dasar nilai otomatis. */
  sourceCategory: string | null;
  isActive: boolean;
  views: number;
  clicks: number;
  consignmentItemId: string | null;
  consignmentStatus: "AVAILABLE" | "SOLD" | "RETURNED" | null;
  consignmentNumber: string | null;
  consignmentId: string | null;
  usedItemId: string | null;
  usedStatus: "AVAILABLE" | "SOLD" | "WITHDRAWN" | null;
  usedNumber: string | null;
}
interface ProductOpt {
  id: string;
  name: string;
  sellPrice: number;
  category: string | null;
}
interface ConsignmentOpt {
  id: string;
  label: string;
  owner: string;
  number: string;
  askingPrice: number;
  condition: string | null;
  category: string;
  inGallery: boolean;
}
interface UsedOpt {
  id: string;
  label: string;
  number: string;
  sellPrice: number;
  category: string;
  spec: string;
  inGallery: boolean;
}
type Form = {
  id?: string;
  productId: string;
  consignmentItemId: string;
  usedItemId: string;
  title: string;
  spec: string;
  price: number;
  photo: string | null;
  label: string;
  category: string;
  brand: string;
  isActive: boolean;
};

const BLANK: Form = { productId: "", consignmentItemId: "", usedItemId: "", title: "", spec: "", price: 0, photo: null, label: "", category: "", brand: "", isActive: true };
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
  consignments = [],
  usedItems = [],
}: {
  items: GalleryRow[];
  products: ProductOpt[];
  /** Barang titipan yang masih dititipkan (bisa dipajang). */
  consignments?: ConsignmentOpt[];
  /** Barang bekas yang masih tersedia (bisa dipajang). */
  usedItems?: UsedOpt[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const totalViews = items.reduce((s, i) => s + i.views, 0);
  const totalClicks = items.reduce((s, i) => s + i.clicks, 0);

  function startNew() {
    setForm({ ...BLANK });
  }
  function startEdit(it: GalleryRow) {
    setForm({
      id: it.id,
      productId: it.productId ?? "",
      consignmentItemId: it.consignmentItemId ?? "",
      usedItemId: it.usedItemId ?? "",
      title: it.title,
      spec: it.spec ?? "",
      price: it.price,
      photo: it.photo,
      label: it.label ?? "",
      category: it.category ?? "",
      brand: it.brand ?? "",
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
      consignmentItemId: "", // produk, barang titipan & barang bekas saling eksklusif
      usedItemId: "",
      ...(p && !form?.title ? { title: p.name } : {}),
      ...(p && (!form?.price || form.price === 0) ? { price: p.sellPrice } : {}),
    });
  }

  function onPickConsignment(id: string) {
    const c = consignments.find((x) => x.id === id);
    patch({
      consignmentItemId: id,
      productId: "",
      usedItemId: "",
      ...(c ? { price: c.askingPrice } : {}), // harga selalu mengikuti harga titipan
      ...(c && !form?.title ? { title: c.label } : {}),
      ...(c && !form?.spec && c.condition ? { spec: c.condition } : {}),
    });
  }

  function onPickUsed(id: string) {
    const u = usedItems.find((x) => x.id === id);
    patch({
      usedItemId: id,
      productId: "",
      consignmentItemId: "",
      ...(u ? { price: u.sellPrice } : {}), // harga selalu mengikuti harga jual barang bekas
      ...(u && !form?.title ? { title: u.label } : {}),
      ...(u && !form?.spec ? { spec: u.spec } : {}),
      ...(u && !form?.label ? { label: "Bekas" } : {}),
    });
  }

  // Opsi barang bekas: yang belum dipajang + tautan item yang sedang diedit.
  const usedChoices = usedItems.filter((u) => !u.inGallery || u.id === form?.usedItemId);
  const usedLinkedButGone = !!form?.usedItemId && !usedChoices.some((u) => u.id === form.usedItemId);

  // Opsi barang titipan: yang belum dipajang + tautan item yang sedang diedit.
  const consignmentChoices = consignments.filter((c) => !c.inGallery || c.id === form?.consignmentItemId);
  const editingRow = form?.id ? items.find((i) => i.id === form.id) : undefined;
  const linkedButGone =
    !!form?.consignmentItemId && !consignmentChoices.some((c) => c.id === form.consignmentItemId);

  // Nilai otomatis (bila kolom dikosongkan) — sama dengan yang dipakai halaman publik.
  const formSourceCategory = form
    ? (products.find((p) => p.id === form.productId)?.category ??
      consignments.find((c) => c.id === form.consignmentItemId)?.category ??
      usedItems.find((u) => u.id === form.usedItemId)?.category ??
      (editingRow &&
      editingRow.productId === (form.productId || null) &&
      editingRow.consignmentItemId === (form.consignmentItemId || null) &&
      editingRow.usedItemId === (form.usedItemId || null)
        ? editingRow.sourceCategory
        : null))
    : null;
  const auto = form ? resolveFacets({ title: form.title, sourceCategory: formSourceCategory }) : null;
  // Saran isian: nilai yang sudah dipakai di galeri + kategori umum.
  const facetSuggestions = (key: "category" | "brand") =>
    [
      ...new Set(
        items
          .map((i) => resolveFacets({ title: i.title, category: i.category, brand: i.brand, sourceCategory: i.sourceCategory })[key])
          .filter((v): v is string => !!v),
      ),
    ].sort((a, b) => a.localeCompare(b, "id"));

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
      consignmentItemId: form.consignmentItemId || null,
      usedItemId: form.usedItemId || null,
      title: form.title,
      spec: form.spec || null,
      price: form.price,
      photo: form.photo, // dataUrl / null
      label: form.label || null,
      category: form.category.trim() || null,
      brand: form.brand.trim() || null,
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
              {(consignments.length > 0 || form.consignmentItemId) && (
                <div className="space-y-1.5">
                  <Label htmlFor="g-cons">…atau tautkan barang titipan (Titip Jual)</Label>
                  <Select id="g-cons" value={form.consignmentItemId} onChange={(e) => onPickConsignment(e.target.value)}>
                    <option value="">— Bukan barang titipan —</option>
                    {consignmentChoices.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.label} · {formatRupiah(c.askingPrice)} · {c.owner} ({c.number})
                      </option>
                    ))}
                    {linkedButGone && (
                      <option value={form.consignmentItemId}>
                        Barang titipan {editingRow?.consignmentNumber ?? ""} (sudah tidak dititipkan)
                      </option>
                    )}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tampil di galeri publik selama barang masih dititipkan — otomatis hilang saat laku atau diambil kembali.
                    Harga mengikuti harga di Titip Jual.
                  </p>
                </div>
              )}
              {(usedItems.length > 0 || form.usedItemId) && (
                <div className="space-y-1.5">
                  <Label htmlFor="g-used">…atau tautkan barang bekas</Label>
                  <Select id="g-used" value={form.usedItemId} onChange={(e) => onPickUsed(e.target.value)}>
                    <option value="">— Bukan barang bekas —</option>
                    {usedChoices.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label} · {formatRupiah(u.sellPrice)} ({u.number})
                      </option>
                    ))}
                    {usedLinkedButGone && (
                      <option value={form.usedItemId}>
                        Barang bekas {editingRow?.usedNumber ?? ""} (sudah tidak tersedia)
                      </option>
                    )}
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Tampil di galeri publik selama barang masih tersedia — otomatis hilang saat laku atau ditarik.
                    Harga mengikuti harga jual di menu Barang Bekas.
                  </p>
                </div>
              )}
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
                    disabled={!!form.consignmentItemId || !!form.usedItemId}
                    title={
                      form.consignmentItemId
                        ? "Ubah harga lewat menu Titip Jual"
                        : form.usedItemId
                          ? "Ubah harga lewat menu Barang Bekas"
                          : undefined
                    }
                  />
                  {form.consignmentItemId && (
                    <p className="text-xs text-muted-foreground">Ubah harga lewat menu Titip Jual.</p>
                  )}
                  {form.usedItemId && (
                    <p className="text-xs text-muted-foreground">Ubah harga lewat menu Barang Bekas.</p>
                  )}
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
              <div className="grid gap-3 sm:grid-cols-2">
                <datalist id="g-cat-list">
                  {facetSuggestions("category").map((v) => <option key={v} value={v} />)}
                </datalist>
                <datalist id="g-brand-list">
                  {facetSuggestions("brand").map((v) => <option key={v} value={v} />)}
                </datalist>
                <div className="space-y-1.5">
                  <Label htmlFor="g-cat">Kategori <span className="font-normal text-muted-foreground">(filter galeri)</span></Label>
                  <Input
                    id="g-cat"
                    list="g-cat-list"
                    value={form.category}
                    onChange={(e) => patch({ category: e.target.value })}
                    placeholder={auto?.category ? `Otomatis: ${auto.category}` : "mis. VGA, Laptop, Monitor"}
                    maxLength={40}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="g-brand">Brand <span className="font-normal text-muted-foreground">(filter galeri)</span></Label>
                  <Input
                    id="g-brand"
                    list="g-brand-list"
                    value={form.brand}
                    onChange={(e) => patch({ brand: e.target.value })}
                    placeholder={auto?.brand ? `Otomatis: ${auto.brand}` : "mis. ASUS, MSI, Logitech"}
                    maxLength={40}
                  />
                </div>
                <p className="text-xs text-muted-foreground sm:col-span-2">
                  Kosongkan untuk otomatis (dari kategori produk/titipan/barang bekas atau ditebak dari judul). Pelanggan
                  bisa menyaring galeri berdasarkan kategori, brand, kondisi & harga.
                </p>
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

      {/* Ringkasan minat konsumen */}
      {items.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:max-w-md">
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Eye className="size-4" /> Total dilihat
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums">{totalViews.toLocaleString("id-ID")}</p>
          </Card>
          <Card className="p-4">
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MessageCircle className="size-4" /> Total klik Chat WA
            </p>
            <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-primary">{totalClicks.toLocaleString("id-ID")}</p>
          </Card>
        </div>
      )}

      {/* Daftar pajangan */}
      {items.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Belum ada pajangan. Tekan <strong>Tambah Pajangan</strong> untuk mulai mengisi etalase.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            // Barang titipan yang laku/diambil kembali → tersembunyi otomatis dari publik.
            const consignmentGone = !!it.consignmentItemId && it.consignmentStatus !== "AVAILABLE";
            // Barang bekas yang laku/ditarik → tersembunyi otomatis dari publik.
            const usedGone = !!it.usedItemId && it.usedStatus !== "AVAILABLE";
            return (
            <Card key={it.id} className={cn("flex flex-col overflow-hidden", (!it.isActive || consignmentGone || usedGone) && "opacity-60")}>
              <div className="relative aspect-video bg-muted/40">
                {it.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={it.photo} alt={it.title} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center text-xs text-muted-foreground">Tanpa foto</div>
                )}
                {it.label && <Badge className="absolute left-2 top-2 gradient-brand text-primary-foreground">{it.label}</Badge>}
                {!it.isActive && <span className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Nonaktif</span>}
                {consignmentGone && (
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-background/90 px-2 py-1 text-center text-[11px] font-medium">
                    {it.consignmentStatus === "SOLD" ? "Sudah laku" : "Diambil pemilik"} — otomatis disembunyikan
                  </span>
                )}
                {usedGone && (
                  <span className="absolute inset-x-2 bottom-2 rounded-md bg-background/90 px-2 py-1 text-center text-[11px] font-medium">
                    {it.usedStatus === "SOLD" ? "Sudah laku" : "Ditarik dari penjualan"} — otomatis disembunyikan
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col gap-1 p-3">
                {(() => {
                  const fx = resolveFacets({ title: it.title, category: it.category, brand: it.brand, sourceCategory: it.sourceCategory });
                  const meta = [fx.category, fx.brand].filter(Boolean).join(" · ");
                  return meta ? <p className="text-[10.5px] font-semibold uppercase tracking-wide text-primary">{meta}</p> : null;
                })()}
                <p className="line-clamp-1 font-semibold">{it.title}</p>
                {it.consignmentItemId && it.consignmentId && (
                  <Link
                    href={`/consignments/${it.consignmentId}`}
                    className="w-fit rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-700 hover:underline dark:text-amber-300"
                  >
                    Titipan {it.consignmentNumber}
                  </Link>
                )}
                {it.usedItemId && (
                  <Link
                    href={`/used-items/${it.usedItemId}`}
                    className="w-fit rounded-full bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold text-sky-700 hover:underline dark:text-sky-300"
                  >
                    Bekas {it.usedNumber}
                  </Link>
                )}
                {it.spec && <p className="line-clamp-2 text-xs text-muted-foreground">{it.spec}</p>}
                <p className="mt-1 font-mono font-bold tabular-nums text-primary">
                  {it.price > 0 ? formatRupiah(it.price) : "Hubungi"}
                </p>
                <div className="mt-1.5 flex items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1" title="Dilihat konsumen (unik per sesi pengunjung)">
                    <Eye className="size-3.5" />
                    <span className="font-mono font-medium tabular-nums text-foreground">{it.views}</span> dilihat
                  </span>
                  <span className="inline-flex items-center gap-1" title="Klik tombol “Chat WA” (minat konsumen)">
                    <MessageCircle className="size-3.5" />
                    <span className="font-mono font-medium tabular-nums text-foreground">{it.clicks}</span> chat
                  </span>
                </div>
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
            );
          })}
        </div>
      )}
    </div>
  );
}
