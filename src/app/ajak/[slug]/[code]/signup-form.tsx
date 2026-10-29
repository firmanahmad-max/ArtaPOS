"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, Images, Loader2, MessageCircle, UserPlus } from "lucide-react";
import { registerFriendAction } from "@/server/referrals/actions";
import { waLink } from "@/lib/whatsapp";

/** Form daftar teman yang diajak (nama + No. WA + izin dihubungi). */
export function FriendSignupForm({
  slug,
  code,
  storeName,
  storePhone,
}: {
  slug: string;
  code: string;
  storeName: string;
  storePhone: string | null;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [consent, setConsent] = useState(true);
  const [website, setWebsite] = useState(""); // honeypot
  const [done, setDone] = useState<{ validDays: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    start(async () => {
      const r = await registerFriendAction(slug, code, { name, phone, consent, website });
      if (r.ok) setDone({ validDays: r.validDays });
      else setError(r.message);
    });
  }

  if (done) {
    const msg = `Halo ${storeName}, saya ${name.trim()} — baru daftar lewat program Ajak Teman (kode ${code}). Saya mau tanya-tanya dulu.`;
    return (
      <div className="mt-6 space-y-4 rounded-2xl border bg-card p-5 text-center">
        <CheckCircle2 className="mx-auto size-10 text-success" />
        <p className="text-lg font-bold">Pendaftaran berhasil! 🎉</p>
        <p className="text-sm text-muted-foreground">
          Saat belanja, servis, atau rakit PC di {storeName}, sebutkan <b>nama & No. WA ({phone.trim()})</b> ke kasir. Bonus poin
          otomatis masuk setelah transaksi pertama Anda lunas{done.validDays ? ` (berlaku ${done.validDays} hari)` : ""}.
        </p>
        <div className="flex flex-col gap-2">
          {storePhone && (
            <a
              href={waLink(msg, storePhone)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#25D366] text-sm font-semibold text-white hover:opacity-90"
            >
              <MessageCircle className="size-4" /> Chat {storeName} via WhatsApp
            </a>
          )}
          <Link
            href={`/galeri/${slug}`}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-semibold hover:bg-accent"
          >
            <Images className="size-4" /> Lihat produk & promo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl border bg-card p-5">
      <p className="font-semibold">Daftar sebagai member — gratis</p>
      <div className="space-y-1.5">
        <label htmlFor="rf-name" className="text-sm font-medium">Nama</label>
        <input
          id="rf-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          maxLength={80}
          autoComplete="name"
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="Nama lengkap"
        />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="rf-phone" className="text-sm font-medium">No. WhatsApp</label>
        <input
          id="rf-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          required
          inputMode="tel"
          autoComplete="tel"
          maxLength={20}
          className="h-11 w-full rounded-lg border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          placeholder="08xxxxxxxxxx"
        />
      </div>
      {/* Honeypot: tersembunyi dari manusia, sering diisi bot. */}
      <input
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        name="website"
      />
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" className="mt-0.5 size-4 accent-[var(--primary)]" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>
          Bersedia dihubungi {storeName} via WhatsApp
          <span className="block text-xs text-muted-foreground">Info bonus, status servis & promo. Bisa berhenti kapan saja.</span>
        </span>
      </label>
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-xl gradient-brand text-base font-semibold text-primary-foreground shadow-brand disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-5 animate-spin" /> : <UserPlus className="size-5" />} Daftar & ambil bonus
      </button>
      <p className="text-center text-[11px] text-muted-foreground">
        Data Anda hanya dipakai {storeName} untuk layanan & bonus member.
      </p>
    </form>
  );
}
