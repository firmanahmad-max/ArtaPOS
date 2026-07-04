import { APP_TAGLINE } from "@/lib/brand";

/**
 * Splash screen brand. Tampil sekali per sesi saat aplikasi pertama dibuka,
 * lalu memudar otomatis (~2,4 detik total) — murni CSS (lihat globals.css:
 * `.app-splash`). Skrip pra-paint di layout menambah class `splash-seen` bila
 * sudah pernah tampil di sesi ini, sehingga tak berkedip pada muat ulang.
 */
export function SplashScreen() {
  return (
    <div className="app-splash" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/icon-512.png"
        alt=""
        width={132}
        height={132}
        draggable={false}
        className="app-splash-logo size-[132px] object-contain"
      />
      <div className="text-center">
        <p className="text-3xl font-bold tracking-tight">
          <span style={{ color: "#e8e8ef" }}>Arta</span>
          <span style={{ color: "#8b5cf6" }}>POS</span>
        </p>
        <p className="mt-1 text-sm" style={{ color: "#a78bfa" }}>
          {APP_TAGLINE}
        </p>
      </div>
      <div className="mt-1 flex gap-1.5">
        <span className="app-splash-dot size-2 rounded-full" style={{ animationDelay: "0s" }} />
        <span className="app-splash-dot size-2 rounded-full" style={{ animationDelay: ".15s" }} />
        <span className="app-splash-dot size-2 rounded-full" style={{ animationDelay: ".3s" }} />
      </div>
    </div>
  );
}
