"use client";

import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Save, ImagePlus, Trash2, Check, KeyRound, Rocket } from "lucide-react";
import { updateSettingsAction, updateLicenseAction, updateStoreLogoAction, updateTrackPromoImageAction } from "@/server/admin/actions";
import { redeemPromoCodeAction } from "@/server/license/actions";
import { reopenQuickStart } from "@/components/onboarding/quick-start";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const COLOR_THEMES = [
  { id: "terakota", name: "Terakota", c1: "#C0603E", c2: "#DE9572" },
  { id: "mint", name: "Mint", c1: "#3FAE8E", c2: "#7FCDB8" },
  { id: "lavender", name: "Lavender", c1: "#7B6FD0", c2: "#B492E6" },
  { id: "sky", name: "Sky", c1: "#4F92D8", c2: "#93BEEA" },
  { id: "ocean", name: "Ocean", c1: "#1E2A44", c2: "#3B82F6" },
] as const;

const themeListeners = new Set<() => void>();
function subscribeTheme(cb: () => void) {
  themeListeners.add(cb);
  return () => themeListeners.delete(cb);
}
function getThemeSnapshot() {
  return document.documentElement.getAttribute("data-theme") || "terakota";
}
function setColorTheme(id: string) {
  if (id === "terakota") {
    localStorage.removeItem("color-theme");
    document.documentElement.removeAttribute("data-theme");
  } else {
    localStorage.setItem("color-theme", id);
    document.documentElement.setAttribute("data-theme", id);
  }
  themeListeners.forEach((l) => l());
}

/** Pemilih tema warna — berlaku instan & tersimpan per-perangkat (localStorage). */
export function ColorThemePicker() {
  const active = useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "terakota");

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {COLOR_THEMES.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setColorTheme(t.id)}
          aria-pressed={active === t.id}
          className={cn(
            "flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors hover:bg-accent",
            active === t.id ? "border-primary ring-2 ring-primary/40" : "border-border",
          )}
        >
          <span
            className="h-9 w-full rounded-md"
            style={{ backgroundImage: `linear-gradient(135deg, ${t.c1}, ${t.c2})` }}
          />
          <span className="flex items-center gap-1 text-sm font-medium">
            {active === t.id && <Check className="size-3.5 text-primary" />}
            {t.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function useRefreshOnOk(ok?: boolean) {
  const router = useRouter();
  useEffect(() => {
    if (ok) router.refresh();
  }, [ok, router]);
}

export function StoreSettingsForm({
  name,
  address,
  phone,
  receiptFooter,
  trackPromo,
}: {
  name: string;
  address: string | null;
  phone: string | null;
  receiptFooter: string | null;
  trackPromo: string | null;
}) {
  const [state, action, pending] = useActionState(updateSettingsAction, undefined);
  useRefreshOnOk(state?.ok);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2">
          <Label htmlFor="name">Nama Toko</Label>
          <Input id="name" name="name" defaultValue={name} required />
          {state?.errors?.name && <p className="text-sm text-destructive">{state.errors.name[0]}</p>}
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="phone">No. Telepon/HP (struk)</Label>
          <Input id="phone" name="phone" defaultValue={phone ?? ""} placeholder="mis. 0812-3456-7890" />
        </div>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="address">Alamat Toko (struk)</Label>
        <Input id="address" name="address" defaultValue={address ?? ""} placeholder="mis. Jl. Merdeka No. 10, Bandung" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="receiptFooter">Catatan Kaki Struk</Label>
        <Input
          id="receiptFooter"
          name="receiptFooter"
          defaultValue={receiptFooter ?? ""}
          placeholder="mis. Terima kasih · Barang tidak bisa ditukar"
        />
        <p className="text-xs text-muted-foreground">
          Tampil di bagian bawah struk. Kosongkan untuk pakai teks bawaan.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="trackPromo">Info / Promo Halaman Lacak Servis</Label>
        <Textarea
          id="trackPromo"
          name="trackPromo"
          defaultValue={trackPromo ?? ""}
          rows={3}
          placeholder="mis. Promo: SSD 1TB diskon 10% s/d akhir bulan! Hub. 0812-3456-7890"
        />
        <p className="text-xs text-muted-foreground">
          Tampil untuk pelanggan di halaman publik lacak servis (/lacak). Boleh beberapa baris. Kosongkan untuk menyembunyikan.
        </p>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

/** Resize logo di browser → PNG data URL (maks 240px, latar putih). */
function fileToLogoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const max = 240;
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
        ctx.fillStyle = "#fff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/png"));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function StoreLogoForm({ logo }: { logo: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<string | null>(logo);

  const onFile = async (file: File) => {
    let dataUrl: string;
    try {
      dataUrl = await fileToLogoDataUrl(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses gambar.");
      return;
    }
    start(async () => {
      const r = await updateStoreLogoAction(dataUrl);
      if (r.ok) {
        setCurrent(dataUrl);
        toast.success("Logo toko diperbarui");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal mengunggah logo.");
      }
    });
  };

  const onRemove = () =>
    start(async () => {
      const r = await updateStoreLogoAction(null);
      if (r.ok) {
        setCurrent(null);
        toast.success("Logo toko dihapus");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal menghapus logo.");
      }
    });

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border bg-white">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Logo toko" className="max-h-full max-w-full object-contain" />
        ) : (
          <ImagePlus className="size-6 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Logo tampil di bagian atas struk (cetak & Bluetooth). PNG/JPG, maks ~350KB.
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />} {current ? "Ganti Logo" : "Unggah Logo"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
              <Trash2 className="text-destructive" /> Hapus
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

/** Resize foto promo di browser → JPEG data URL (maks 800px sisi terpanjang). */
function fileToPromoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Gagal membaca file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Gagal memuat gambar"));
      img.onload = () => {
        const max = 800;
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
        resolve(canvas.toDataURL("image/jpeg", 0.78));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function TrackPromoImageForm({ image }: { image: string | null }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [current, setCurrent] = useState<string | null>(image);

  const onFile = async (file: File) => {
    let dataUrl: string;
    try {
      dataUrl = await fileToPromoDataUrl(file);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses gambar.");
      return;
    }
    start(async () => {
      const r = await updateTrackPromoImageAction(dataUrl);
      if (r.ok) {
        setCurrent(dataUrl);
        toast.success("Foto promo diperbarui");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal mengunggah foto.");
      }
    });
  };

  const onRemove = () =>
    start(async () => {
      const r = await updateTrackPromoImageAction(null);
      if (r.ok) {
        setCurrent(null);
        toast.success("Foto promo dihapus");
        router.refresh();
      } else {
        toast.error(r.message ?? "Gagal menghapus foto.");
      }
    });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex aspect-video w-full max-w-sm items-center justify-center overflow-hidden rounded-xl border bg-muted/30">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt="Foto promo" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus className="size-7 text-muted-foreground" />
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">
          Foto produk/promo yang tampil di kartu Info &amp; Promo halaman lacak. PNG/JPG, otomatis diperkecil (maks ~900KB).
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? <Loader2 className="animate-spin" /> : <ImagePlus />} {current ? "Ganti Foto" : "Unggah Foto"}
          </Button>
          {current && (
            <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={onRemove}>
              <Trash2 className="text-destructive" /> Hapus
            </Button>
          )}
        </div>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}

export function LicenseForm({
  plan,
  status,
  maxTransactions,
  validUntil,
}: {
  plan: string;
  status: string;
  maxTransactions: number | null;
  validUntil: string | null;
}) {
  const [state, action, pending] = useActionState(updateLicenseAction, undefined);
  useRefreshOnOk(state?.ok);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <div className="flex flex-col gap-2">
        <Label htmlFor="plan">Paket</Label>
        <Select id="plan" name="plan" defaultValue={plan} className="h-10">
          <option value="DEMO_DAILY">Demo Harian</option>
          <option value="DEMO_MONTHLY">Demo Bulanan</option>
          <option value="DEMO_TRANSACTIONS">Demo (batas transaksi)</option>
          <option value="UNLIMITED">Unlimited</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="status">Status</Label>
        <Select id="status" name="status" defaultValue={status} className="h-10">
          <option value="ACTIVE">Aktif</option>
          <option value="EXPIRED">Kedaluwarsa</option>
          <option value="SUSPENDED">Ditangguhkan</option>
        </Select>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="maxTransactions">Batas Transaksi (untuk Demo batas transaksi)</Label>
        <Input id="maxTransactions" name="maxTransactions" type="number" min="0" defaultValue={maxTransactions ?? ""} placeholder="kosong = tak dibatasi" />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="validUntil">Berlaku Sampai (untuk demo harian/bulanan)</Label>
        <Input id="validUntil" name="validUntil" type="date" defaultValue={validUntil ?? ""} />
      </div>
      <div className="sm:col-span-2 flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan Lisensi
        </Button>
        {state?.message && (
          <span className={state.ok ? "text-sm text-success" : "text-sm text-destructive"}>{state.message}</span>
        )}
      </div>
    </form>
  );
}

/** Tukar kode aktivasi lisensi (dari operator/distributor). Owner saja. */
export function RedeemLicenseForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setMsg(null);
    start(async () => {
      const r = await redeemPromoCodeAction(code.trim());
      setMsg({ ok: r.ok, text: r.message ?? (r.ok ? "Berhasil." : "Gagal.") });
      if (r.ok) {
        setCode("");
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={submit} className="space-y-2 border-t pt-4">
      <Label htmlFor="redeem">Punya kode aktivasi?</Label>
      <div className="flex flex-wrap gap-2">
        <Input
          id="redeem"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="mis. ARTA-XXXXXX"
          className="max-w-xs font-mono"
        />
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending ? <Loader2 className="animate-spin" /> : <KeyRound />} Tukar Kode
        </Button>
      </div>
      {msg && <p className={msg.ok ? "text-sm text-success" : "text-sm text-destructive"}>{msg.text}</p>}
      <p className="text-xs text-muted-foreground">
        Masukkan kode dari admin/distributor untuk mengaktifkan atau memperpanjang lisensi toko.
      </p>
    </form>
  );
}

/** Tombol memunculkan ulang panduan singkat (Quick Start). */
export function ShowQuickStartButton() {
  return (
    <Button variant="outline" onClick={() => reopenQuickStart()}>
      <Rocket /> Lihat Panduan Singkat
    </Button>
  );
}
