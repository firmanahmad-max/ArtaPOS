"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarRange, Loader2, PencilLine, Plus, Power, Save, Trash2, X } from "lucide-react";
import {
  deleteDailyContentAction,
  saveDailyContentAction,
  toggleDailyContentAction,
} from "@/server/daily-content/actions";
import type { DailyContentView } from "@/server/daily-content/service";
import { DAILY_KIND_META, validateDailyItem, type DailyItem, type DailyKind } from "@/lib/daily-content";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { StoryCanvas, STORY_H, STORY_W, type StoryStore } from "../dashboard/story-canvas";

const KINDS: DailyKind[] = ["promo", "motivasi", "tips", "fakta"];
const PREVIEW_W = 220;
const SCALE = PREVIEW_W / STORY_W;

/** Contoh pengisian per jenis (placeholder, bukan nilai). */
const HINT: Record<DailyKind, { title: string; emphasis: string; body: string; cta: string }> = {
  promo: {
    title: "Diskon 10% SSD NVMe minggu ini",
    emphasis: "Diskon 10%",
    body: "Upgrade laptop/PC lebih ngebut. Berlaku untuk semua SSD NVMe sampai Minggu, selama stok ada.",
    cta: "Pesan sekarang, stok terbatas",
  },
  motivasi: {
    title: "Melayani dengan hati, bekerja dengan teliti.",
    emphasis: "dengan hati,",
    body: "Setiap perangkat yang Anda titipkan kami rawat seperti milik sendiri.",
    cta: "Servis laptop & PC terpercaya",
  },
  tips: {
    title: "Laptop baru? Lakukan ini dulu.",
    emphasis: "Lakukan ini dulu.",
    body: "Tiga langkah sederhana agar laptop baru Anda aman & awet sejak hari pertama.",
    cta: "Konsultasi gratis di toko kami",
  },
  fakta: {
    title: "RAM 16 GB kini jadi standar laptop kerja.",
    emphasis: "16 GB",
    body: "Aplikasi kantor, browser & meeting online berjalan jauh lebih lancar dengan RAM 16 GB.",
    cta: "Upgrade RAM di sini",
  },
};

interface FormState {
  id: string | null;
  kind: DailyKind;
  title: string;
  emphasis: string;
  body: string;
  steps: [string, string, string];
  cta: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
}

const EMPTY: FormState = {
  id: null,
  kind: "promo",
  title: "",
  emphasis: "",
  body: "",
  steps: ["", "", ""],
  cta: "",
  startsOn: "",
  endsOn: "",
  isActive: true,
};

function status(it: DailyContentView, today: string): { label: string; cls: string } {
  if (!it.isActive) return { label: "Nonaktif", cls: "bg-muted text-muted-foreground" };
  if (it.endsOn && it.endsOn < today) return { label: "Berakhir", cls: "bg-muted text-muted-foreground" };
  if (it.startsOn && it.startsOn > today) return { label: "Terjadwal", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" };
  return { label: "Tampil", cls: "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400" };
}

const shortDate = (d: string) =>
  new Date(`${d}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const periodText = (it: { startsOn: string | null; endsOn: string | null }) =>
  it.startsOn && it.endsOn
    ? `${shortDate(it.startsOn)} – ${shortDate(it.endsOn)}`
    : it.startsOn
      ? `Mulai ${shortDate(it.startsOn)}`
      : it.endsOn
        ? `Sampai ${shortDate(it.endsOn)}`
        : "Tanpa batas waktu";

export function ContentManager({
  items,
  uses = {},
  today,
  dateLabel,
  store,
}: {
  items: DailyContentView[];
  /** Total pemakaian 30 hari per konten ("custom:<id>" → jumlah). */
  uses?: Record<string, number>;
  today: string;
  dateLabel: string;
  store: StoryStore;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [form, setForm] = useState<FormState | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toDelete, setToDelete] = useState<DailyContentView | null>(null);
  const [filter, setFilter] = useState<DailyKind | "all">("all");

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  const openNew = (kind: DailyKind = "promo") => {
    setErrors({});
    setForm({ ...EMPTY, kind, startsOn: kind === "promo" ? today : "" });
  };
  const openEdit = (it: DailyContentView) => {
    setErrors({});
    setForm({
      id: it.id,
      kind: it.kind,
      title: it.title,
      emphasis: it.emphasis ?? "",
      body: it.body,
      steps: it.steps ?? ["", "", ""],
      cta: it.cta,
      startsOn: it.startsOn ?? "",
      endsOn: it.endsOn ?? "",
      isActive: it.isActive,
    });
  };

  const payload = (f: FormState) => ({
    kind: f.kind,
    title: f.title,
    emphasis: f.emphasis || null,
    body: f.body,
    steps: f.kind === "tips" ? f.steps : [],
    cta: f.cta,
    startsOn: f.startsOn || null,
    endsOn: f.endsOn || null,
    isActive: f.isActive,
  });

  const save = () => {
    if (!form) return;
    const v = validateDailyItem(payload(form));
    setErrors(v);
    if (Object.keys(v).length) return;
    start(async () => {
      const r = await saveDailyContentAction(form.id, payload(form));
      if (!r.ok) {
        if (r.errors) setErrors(r.errors);
        toast.error(r.message ?? "Gagal menyimpan.");
        return;
      }
      toast.success(r.message ?? "Tersimpan.");
      setForm(null);
      router.refresh();
    });
  };

  const toggle = (it: DailyContentView) =>
    start(async () => {
      const r = await toggleDailyContentAction(it.id, !it.isActive);
      if (!r.ok) return void toast.error(r.message ?? "Gagal.");
      router.refresh();
    });

  const remove = (it: DailyContentView) =>
    start(async () => {
      const r = await deleteDailyContentAction(it.id);
      if (!r.ok) return void toast.error(r.message ?? "Gagal.");
      toast.success(r.message ?? "Dihapus.");
      if (form?.id === it.id) setForm(null);
      router.refresh();
    });

  const preview: DailyItem | null = form
    ? {
        title: form.title || HINT[form.kind].title,
        emphasis: form.title ? form.emphasis || undefined : HINT[form.kind].emphasis,
        body: form.body || HINT[form.kind].body,
        steps: form.kind === "tips" ? (form.steps.map((s, i) => s || `Langkah ${i + 1}`) as [string, string, string]) : undefined,
        cta: form.cta || HINT[form.kind].cta,
      }
    : null;

  const shown = filter === "all" ? items : items.filter((i) => i.kind === filter);
  const live = items.filter((i) => status(i, today).label === "Tampil").length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 rounded-2xl border bg-card p-4 text-sm elevate sm:grid-cols-[1fr_auto] sm:items-center">
        <p className="text-muted-foreground">
          <b className="text-foreground">Cara bergilir:</b> untuk jenis yang punya konten toko, konten Anda tampil{" "}
          <b className="text-foreground">selang sehari</b> dengan konten bawaan ArtaPOS. Promo aktif menambah tab{" "}
          <b className="text-foreground">Promo</b> dan masuk giliran tiap 4 hari. Saat ini{" "}
          <b className="font-mono text-foreground">{live}</b> konten tampil.
        </p>
        <Button onClick={() => openNew()} disabled={pending}>
          <Plus /> Konten baru
        </Button>
      </div>

      {form && preview && (
        <div className="grid gap-5 rounded-2xl border border-primary/30 bg-card p-4 elevate sm:p-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-[15px] font-bold">{form.id ? "Ubah konten" : "Konten baru"}</h2>
              <Button variant="ghost" size="icon" onClick={() => setForm(null)} aria-label="Tutup formulir">
                <X />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Jenis</Label>
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Jenis konten">
                {KINDS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => set("kind", k)}
                    aria-pressed={form.kind === k}
                    className={cn(
                      "h-9 rounded-lg border px-3 text-sm font-semibold transition-colors",
                      form.kind === k ? "border-primary bg-accent text-accent-foreground" : "hover:bg-accent/50",
                    )}
                  >
                    {DAILY_KIND_META[k].label}
                  </button>
                ))}
              </div>
            </div>

            <Field id="dc-title" label="Judul gambar" hint={`${form.title.length}/70`} error={errors.title}>
              <Input id="dc-title" value={form.title} maxLength={70} placeholder={HINT[form.kind].title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field id="dc-em" label="Kata yang diwarnai (opsional)" hint="Salin persis dari judul" error={errors.emphasis}>
              <Input id="dc-em" value={form.emphasis} placeholder={HINT[form.kind].emphasis} onChange={(e) => set("emphasis", e.target.value)} />
            </Field>
            <Field id="dc-body" label="Isi / penjelasan" hint={`${form.body.length}/240`} error={errors.body}>
              <Textarea id="dc-body" rows={3} value={form.body} maxLength={240} placeholder={HINT[form.kind].body} onChange={(e) => set("body", e.target.value)} />
            </Field>
            {form.kind === "tips" && (
              <Field id="dc-s0" label="3 langkah singkat" hint="Maks. 40 karakter per langkah" error={errors.steps}>
                <div className="grid gap-2 sm:grid-cols-3">
                  {form.steps.map((s, i) => (
                    <Input
                      key={i}
                      id={`dc-s${i}`}
                      aria-label={`Langkah ${i + 1}`}
                      value={s}
                      maxLength={40}
                      placeholder={`Langkah ${i + 1}`}
                      onChange={(e) => {
                        const next = [...form.steps] as [string, string, string];
                        next[i] = e.target.value;
                        set("steps", next);
                      }}
                    />
                  ))}
                </div>
              </Field>
            )}
            <Field id="dc-cta" label="Ajakan di kaki gambar" hint={`${form.cta.length}/60`} error={errors.cta}>
              <Input id="dc-cta" value={form.cta} maxLength={60} placeholder={HINT[form.kind].cta} onChange={(e) => set("cta", e.target.value)} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="dc-start" label="Mulai tampil (opsional)" error={errors.startsOn}>
                <Input id="dc-start" type="date" value={form.startsOn} onChange={(e) => set("startsOn", e.target.value)} />
              </Field>
              <Field id="dc-end" label="Selesai (opsional)" error={errors.endsOn}>
                <Input id="dc-end" type="date" value={form.endsOn} onChange={(e) => set("endsOn", e.target.value)} />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="size-4 accent-[var(--primary)]" checked={form.isActive} onChange={(e) => set("isActive", e.target.checked)} />
              Aktif (ikut bergilir di Dashboard)
            </label>
            <div className="flex flex-wrap gap-2">
              <Button onClick={save} disabled={pending}>
                {pending ? <Loader2 className="animate-spin" /> : <Save />} Simpan
              </Button>
              <Button variant="outline" onClick={() => setForm(null)} disabled={pending}>
                Batal
              </Button>
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <p className="text-xs font-medium text-muted-foreground">Pratinjau gambar</p>
            <div className="overflow-hidden rounded-[18px] shadow-xl" style={{ width: PREVIEW_W, height: Math.round(STORY_H * SCALE) }} role="img" aria-label="Pratinjau gambar story">
              <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: STORY_W, height: STORY_H }}>
                <StoryCanvas kind={form.kind} item={preview} store={store} dateLabel={dateLabel} />
              </div>
            </div>
            {!form.title && <p className="max-w-[220px] text-center text-[11px] text-muted-foreground">Contoh isi — ketik untuk melihat konten Anda.</p>}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Saring jenis">
        {(["all", ...KINDS] as const).map((k) => {
          const n = k === "all" ? items.length : items.filter((i) => i.kind === k).length;
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              aria-pressed={filter === k}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors",
                filter === k ? "border-primary bg-accent text-accent-foreground" : "bg-card hover:bg-accent/50",
              )}
            >
              {k === "all" ? "Semua" : DAILY_KIND_META[k].label}
              <span className="font-mono text-muted-foreground">{n}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-8 text-center">
          <p className="font-semibold">Belum ada konten toko{filter !== "all" ? ` jenis ${DAILY_KIND_META[filter].label}` : ""}.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Mulai dengan promo minggu ini atau kata-kata khas toko Anda. Konten bawaan ArtaPOS tetap bergilir seperti biasa.
          </p>
          <Button className="mt-4" onClick={() => openNew(filter === "all" ? "promo" : filter)}>
            <Plus /> Buat konten {filter === "all" ? "promo" : DAILY_KIND_META[filter].label.toLowerCase()}
          </Button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2">
          {shown.map((it) => {
            const st = status(it, today);
            return (
              <li key={it.id} className={cn("flex flex-col gap-2 rounded-2xl border bg-card p-4 elevate", !it.isActive && "opacity-70")}>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-accent-foreground">{DAILY_KIND_META[it.kind].label}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-bold", st.cls)}>{st.label}</span>
                  <span className="ml-auto inline-flex items-center gap-1 text-[11.5px] text-muted-foreground">
                    <CalendarRange className="size-3.5" /> {periodText(it)}
                  </span>
                </div>
                <p className="font-semibold leading-snug">{it.title}</p>
                <p className="line-clamp-2 text-sm text-muted-foreground">{it.body}</p>
                <p className="flex flex-wrap justify-between gap-2 text-xs text-muted-foreground">
                  <span>Ajakan: {it.cta}</span>
                  <span>
                    Dipakai <b className="font-mono text-foreground">{(uses[`custom:${it.id}`] ?? 0).toLocaleString("id-ID")}×</b> · 30 hari
                  </span>
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" onClick={() => openEdit(it)} disabled={pending}>
                    <PencilLine /> Ubah
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => toggle(it)} disabled={pending}>
                    <Power /> {it.isActive ? "Nonaktifkan" : "Aktifkan"}
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => setToDelete(it)} disabled={pending}>
                    <Trash2 /> Hapus
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Hapus konten ini?"
        description={toDelete ? `"${toDelete.title}" tidak akan tampil lagi di Dashboard.` : undefined}
        confirmText="Hapus"
        destructive
        onConfirm={() => toDelete && remove(toDelete)}
      />
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <Label htmlFor={id}>{label}</Label>
        {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
      </div>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
