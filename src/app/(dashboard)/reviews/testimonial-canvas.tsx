"use client";

import { forwardRef } from "react";
import { APP_NAME } from "@/lib/brand";

export const TESTI_W = 1080;
export const TESTI_H = 1350;

export interface TestimonialStore {
  name: string;
  logo: string | null;
  phone: string | null;
}

/**
 * Gambar testimoni 1080×1350 (rasio feed IG 4:5, juga pas untuk Status WA).
 * Inline style agar hasil ekspor (shareNodeAsImage) identik dengan pratinjau.
 */
export const TestimonialCanvas = forwardRef<
  HTMLDivElement,
  { name: string; rating: number; comment: string; sourceLabel: string; store: TestimonialStore }
>(function TestimonialCanvas({ name, rating, comment, sourceLabel, store }, ref) {
  const long = comment.length > 260;
  return (
    <div
      ref={ref}
      style={{
        width: TESTI_W,
        height: TESTI_H,
        position: "relative",
        overflow: "hidden",
        background: "linear-gradient(160deg, #1b0f3b 0%, #3b1d7e 55%, #6d3df5 100%)",
        color: "#fff",
        fontFamily: "Archivo, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        padding: "96px 96px 80px",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(255,255,255,0.09) 2px, transparent 2px)",
          backgroundSize: "26px 26px",
        }}
      />
      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 24 }}>
        {store.logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={store.logo} alt="" style={{ height: 96, maxWidth: 220, objectFit: "contain", background: "#fff", borderRadius: 20, padding: 10 }} />
        ) : null}
        <div>
          <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -0.5 }}>{store.name}</div>
          <div style={{ fontSize: 26, opacity: 0.75, letterSpacing: 4, textTransform: "uppercase", marginTop: 6 }}>Kata Pelanggan</div>
        </div>
      </div>

      <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
        <div style={{ fontSize: 220, lineHeight: 0.6, fontFamily: "Georgia, serif", color: "#fbbf24", height: 110 }}>&ldquo;</div>
        <div style={{ fontSize: 72, color: "#fbbf24", letterSpacing: 10, marginTop: 24 }}>
          {"★".repeat(rating)}
          <span style={{ color: "rgba(255,255,255,0.25)" }}>{"★".repeat(5 - rating)}</span>
        </div>
        <p
          style={{
            fontSize: long ? 44 : 54,
            lineHeight: 1.35,
            fontWeight: 600,
            margin: "36px 0 0",
            whiteSpace: "pre-line",
            letterSpacing: -0.3,
          }}
        >
          {comment}
        </p>
        <div style={{ marginTop: 44, fontSize: 36, fontWeight: 700 }}>
          — {name}
          <span style={{ fontWeight: 400, opacity: 0.7 }}> · {sourceLabel}</span>
        </div>
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          fontSize: 28,
          opacity: 0.85,
        }}
      >
        <span>{store.phone ? `WA ${store.phone}` : ""}</span>
        <span style={{ fontSize: 22, opacity: 0.7, letterSpacing: 2 }}>Dibuat dengan {APP_NAME.toUpperCase()}</span>
      </div>
    </div>
  );
});
