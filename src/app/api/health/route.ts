import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/**
 * Health check — memastikan app & koneksi database hidup.
 * GET /api/health  (PUBLIK, tanpa auth)
 *
 * Sengaja MINIM info: hanya status hidup/mati + batas pool (angka konfigurasi,
 * bukan rahasia). TIDAK membocorkan jumlah tenant (info bisnis) maupun pesan
 * error DB mentah (bisa membocorkan host/driver) ke pemanggil anonim.
 */
export async function GET() {
  const isProd = env.NODE_ENV === "production";
  const pool = {
    max: env.DB_POOL_MAX ?? (isProd ? 5 : 10),
    source: env.DB_POOL_MAX != null ? "DB_POOL_MAX" : "default",
  };
  try {
    // Ping ringan (bukan hitung tenant) — cukup untuk memastikan DB merespons.
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({
      status: "ok",
      database: "connected",
      pool,
      time: new Date().toISOString(),
    });
  } catch {
    // Jangan sertakan detail error (host/driver) ke publik.
    return NextResponse.json(
      { status: "error", database: "disconnected" },
      { status: 503 },
    );
  }
}
