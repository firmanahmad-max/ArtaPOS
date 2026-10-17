import { forwardRef } from "react";
import { Playfair_Display } from "next/font/google";
import { DAILY_KIND_META, splitEmphasis, type DailyItem, type DailyKind } from "@/lib/daily-content";

const display = Playfair_Display({ subsets: ["latin"], weight: ["800"], style: ["normal", "italic"], display: "swap" });

export const STORY_W = 1080;
export const STORY_H = 1920;

const THEME: Record<DailyKind, { bg: string; glow: string; pill: string; accent: string; stepText: string }> = {
  motivasi: {
    bg: "linear-gradient(165deg, #1a1a1e 0%, #0d0d0f 55%, #3a0b0d 100%)",
    glow: "radial-gradient(circle at 85% 8%, rgba(215,20,26,.45), transparent 45%)",
    pill: "#d7141a",
    accent: "#ff5a5f",
    stepText: "#8e0b0f",
  },
  tips: {
    bg: "linear-gradient(165deg, #d7141a 0%, #a50d12 60%, #6e070b 100%)",
    glow: "radial-gradient(circle at 85% 8%, rgba(255,255,255,.22), transparent 45%)",
    pill: "#141414",
    accent: "#ffd5d6",
    stepText: "#8e0b0f",
  },
  fakta: {
    bg: "linear-gradient(165deg, #211043 0%, #2a1460 50%, #3b1d7e 100%)",
    glow: "radial-gradient(circle at 85% 8%, rgba(168,85,247,.5), transparent 45%)",
    pill: "#7c3aed",
    accent: "#d8b4fe",
    stepText: "#3b1d7e",
  },
};

export interface StoryStore {
  name: string;
  logo: string | null;
  phone: string | null;
  footer: string | null;
}

/**
 * Gambar Status WA / Story IG 1080×1920 bermerek toko. Dirender sebagai DOM biasa
 * (di-scale untuk pratinjau) lalu diekspor ke PNG oleh `shareNodeAsImage`.
 * Inline style sengaja (bukan kelas Tailwind) agar hasil ekspor identik di semua tema.
 */
export const StoryCanvas = forwardRef<
  HTMLDivElement,
  { kind: DailyKind; item: DailyItem; store: StoryStore; dateLabel: string }
>(function StoryCanvas({ kind, item, store, dateLabel }, ref) {
  const t = THEME[kind];
  const [pre, em, post] = splitEmphasis(item.title, item.emphasis);
  const long = item.title.length > 48;
  return (
    <div
      ref={ref}
      style={{
        width: STORY_W,
        height: STORY_H,
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "84px 84px 64px",
        display: "flex",
        flexDirection: "column",
        color: "#ffffff",
        fontFamily: "var(--font-archivo), Archivo, system-ui, sans-serif",
        backgroundImage: `${t.glow}, radial-gradient(rgba(255,255,255,.07) 1.2px, transparent 1.6px), ${t.bg}`,
        backgroundSize: "100% 100%, 22px 22px, 100% 100%",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        {store.logo ? (
          <div style={{ background: "#ffffff", borderRadius: 26, padding: "12px 18px", boxShadow: "0 20px 50px rgba(0,0,0,.35)", display: "flex" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={store.logo} alt="" style={{ maxWidth: 220, maxHeight: 110, objectFit: "contain", display: "block" }} />
          </div>
        ) : null}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: ".03em", textTransform: "uppercase", lineHeight: 1.1 }}>{store.name}</div>
          <div style={{ fontSize: 24, color: "rgba(255,255,255,.7)", marginTop: 6 }}>Konten harian · {dateLabel}</div>
        </div>
      </div>

      {/* Blok konten dipusatkan vertikal di antara kepala & kaki → seimbang untuk konten pendek maupun panjang. */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "48px 0 56px" }}>
        <div>
          <span style={{ display: "inline-block", padding: "12px 28px", borderRadius: 999, background: t.pill, fontSize: 24, fontWeight: 800, letterSpacing: ".24em" }}>
            {DAILY_KIND_META[kind].kicker}
          </span>
        </div>

        <div style={{ marginTop: 48 }}>
          {kind === "motivasi" && (
            <div className={display.className} style={{ fontSize: 220, lineHeight: 0.6, height: 100, color: t.accent }}>
              “
            </div>
          )}
          <h1
            className={display.className}
            style={{ margin: kind === "motivasi" ? "28px 0 0" : 0, fontSize: long ? 82 : 96, lineHeight: 1.08, fontWeight: 800, letterSpacing: "-.01em" }}
          >
            {pre}
            {em && <em style={{ color: t.accent }}>{em}</em>}
            {post}
          </h1>

          {item.steps && (
            <p style={{ margin: "36px 0 0", fontSize: 36, lineHeight: 1.45, color: "rgba(255,255,255,.86)", maxWidth: 880 }}>{item.body}</p>
          )}
          {item.steps ? (
            <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 22 }}>
              {item.steps.map((s, i) => (
                <div
                  key={i}
                  style={{ display: "flex", alignItems: "center", gap: 28, padding: "26px 32px", borderRadius: 28, background: "rgba(255,255,255,.12)", border: "1px solid rgba(255,255,255,.2)" }}
                >
                  <span style={{ flex: "none", width: 72, height: 72, borderRadius: 999, background: "#ffffff", color: t.stepText, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 34, fontWeight: 800 }}>
                    {i + 1}
                  </span>
                  <span style={{ fontSize: 38, fontWeight: 700 }}>{s}</span>
                </div>
              ))}
            </div>
          ) : item.compare ? (
            <div style={{ marginTop: 56, padding: 40, borderRadius: 32, background: "rgba(255,255,255,.08)", border: "1px solid rgba(255,255,255,.18)", display: "flex", flexDirection: "column", gap: 34 }}>
              {[item.compare.a, item.compare.b].map((c, i) => (
                <div key={i}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 32, fontWeight: 600 }}>
                    <span>{c.label}</span>
                    <span style={{ fontFamily: "var(--font-jetbrains), monospace" }}>{c.value}</span>
                  </div>
                  <div style={{ marginTop: 14, height: 30, borderRadius: 999, background: "rgba(255,255,255,.14)" }}>
                    <div
                      style={{
                        width: `${Math.max(4, c.pct)}%`,
                        height: "100%",
                        borderRadius: 999,
                        background: i === 1 ? "linear-gradient(90deg, #a78bfa, #f0abfc)" : "rgba(255,255,255,.6)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!item.steps && (
            <p style={{ margin: "40px 0 0", fontSize: 38, lineHeight: 1.45, color: "rgba(255,255,255,.84)", maxWidth: 880 }}>{item.body}</p>
          )}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 28, padding: "32px 36px 32px 44px", borderRadius: 36, background: "#ffffff", color: "#141414" }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.15 }}>{item.cta}</div>
          <div style={{ fontSize: 28, color: "#5f5a6b", marginTop: 8 }}>
            {store.phone ? `Chat WhatsApp ${store.phone}` : `Kunjungi ${store.name}`}
          </div>
        </div>
        <div style={{ flex: "none", width: 96, height: 96, borderRadius: 999, background: "#1fa855", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" />
          </svg>
        </div>
      </div>
      <div style={{ marginTop: 30, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20, fontSize: 24, color: "rgba(255,255,255,.72)" }}>
        <span style={{ letterSpacing: ".04em", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{store.footer ?? store.name}</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, padding: "8px 18px", borderRadius: 999, background: "rgba(255,255,255,.1)", fontSize: 20, flex: "none" }}>
          <span style={{ width: 22, height: 22, borderRadius: 7, background: "linear-gradient(135deg, #6d3ce0, #9b4df5)" }} />
          Dibuat dengan <b style={{ letterSpacing: ".06em", color: "#ffffff" }}>ARTAPOS</b>
        </span>
      </div>
    </div>
  );
});
